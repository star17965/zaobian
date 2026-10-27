param(
    [string]$SdkRoot = $env:ANDROID_SDK_ROOT,
    [string]$JdkRoot = $env:JAVA_HOME,
    [string]$Python = "python",
    [string]$Keystore = "",
    [string]$StorePass = $env:ZAOBIAN_STORE_PASS,
    [string]$VersionName = "0.1.0"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$AppRoot = Split-Path $ProjectRoot -Parent
$BuildRoot = Join-Path $ProjectRoot "build"
$DistRoot = Join-Path $AppRoot "dist"
$AssetsRoot = Join-Path $ProjectRoot "assets"
$AndroidJar = Join-Path $SdkRoot "platforms\android-34\android.jar"
$BuildTools = Join-Path $SdkRoot "build-tools\34.0.0"
$OutputName = "zaobian-v$VersionName.apk"

if (-not $SdkRoot) { throw "Set ANDROID_SDK_ROOT or pass -SdkRoot." }
if (-not $JdkRoot) { throw "Set JAVA_HOME or pass -JdkRoot." }

$pythonCmd = Get-Command $Python -ErrorAction SilentlyContinue
if (-not $pythonCmd) { throw "Python not found. Pass -Python <path-to-python.exe>." }
$PythonExe = $pythonCmd.Source

foreach ($required in @($AndroidJar, (Join-Path $BuildTools "aapt2.exe"), (Join-Path $JdkRoot "bin\javac.exe"))) {
    if (-not (Test-Path $required)) { throw "Missing build component: $required" }
}

$env:JAVA_HOME = $JdkRoot
$env:Path = "$JdkRoot\bin;$BuildTools;$env:Path"

if (-not $Keystore) { $Keystore = Join-Path $ProjectRoot "keystore\zaobian.keystore" }
$keystoreDir = Split-Path $Keystore -Parent
New-Item -ItemType Directory -Force -Path $keystoreDir | Out-Null

if (Test-Path $BuildRoot) { Remove-Item $BuildRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $BuildRoot, $DistRoot, $AssetsRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BuildRoot "classes"), (Join-Path $BuildRoot "dex"), (Join-Path $BuildRoot "gen") | Out-Null

Write-Host "[1/8] Copying web app into assets..."
$assetsWww = Join-Path $AssetsRoot "www"
if (Test-Path $assetsWww) { Remove-Item $assetsWww -Recurse -Force }
Copy-Item -Path (Join-Path $AppRoot "www") -Destination $assetsWww -Recurse
$assetFiles = (Get-ChildItem $assetsWww -Recurse -File | Measure-Object).Count
Write-Host "      $assetFiles files"

Write-Host "[2/8] Compiling resources..."
& (Join-Path $BuildTools "aapt2.exe") compile --dir (Join-Path $ProjectRoot "res") -o (Join-Path $BuildRoot "res.zip")
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

Write-Host "[3/8] Linking resources + assets..."
& (Join-Path $BuildTools "aapt2.exe") link `
    -o (Join-Path $BuildRoot "base.apk") `
    -I $AndroidJar `
    --manifest (Join-Path $ProjectRoot "AndroidManifest.xml") `
    --java (Join-Path $BuildRoot "gen") `
    -A $AssetsRoot `
    --min-sdk-version 23 `
    --target-sdk-version 34 `
    --version-code 1 `
    --version-name $VersionName `
    --auto-add-overlay `
    (Join-Path $BuildRoot "res.zip")
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

Write-Host "[4/8] Compiling Java..."
$sources = Get-ChildItem -Path (Join-Path $ProjectRoot "src"), (Join-Path $BuildRoot "gen") -Recurse -Filter *.java | ForEach-Object { $_.FullName }
& (Join-Path $JdkRoot "bin\javac.exe") `
    -encoding UTF-8 `
    -source 8 `
    -target 8 `
    -classpath $AndroidJar `
    -d (Join-Path $BuildRoot "classes") `
    $sources
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

Write-Host "[5/8] Generating classes.dex..."
& (Join-Path $BuildTools "d8.bat") `
    --release `
    --min-api 23 `
    --lib $AndroidJar `
    --output (Join-Path $BuildRoot "dex") `
    (Get-ChildItem -Path (Join-Path $BuildRoot "classes") -Recurse -Filter *.class | ForEach-Object { $_.FullName })
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

Write-Host "[6/8] Assembling APK..."
& $PythonExe (Join-Path $ProjectRoot "tools\add_dex.py") `
    (Join-Path $BuildRoot "base.apk") `
    (Join-Path $BuildRoot "dex\classes.dex") `
    (Join-Path $BuildRoot "unsigned.apk")
if ($LASTEXITCODE -ne 0) { throw "APK assembly failed" }

& (Join-Path $BuildTools "zipalign.exe") -p -f 4 (Join-Path $BuildRoot "unsigned.apk") (Join-Path $BuildRoot "aligned.apk")
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

Write-Host "[7/8] Signing APK..."
if (-not (Test-Path $Keystore)) {
    if (-not $StorePass) { $StorePass = [Guid]::NewGuid().ToString("N").Substring(0, 16) }
    & (Join-Path $JdkRoot "bin\keytool.exe") -genkeypair `
        -keystore $Keystore `
        -storepass $StorePass `
        -keypass $StorePass `
        -alias zaobian `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -dname "CN=Zaobian Demo, O=Zaobian, C=CN"
    if ($LASTEXITCODE -ne 0) { throw "key generation failed" }
    Set-Content -Path (Join-Path $keystoreDir "password.txt") -Value $StorePass -Encoding UTF8
    Write-Host "      Generated a local keystore; password is in keystore/password.txt (gitignored)."
}

if (-not $StorePass) {
    $passwordFile = Join-Path $keystoreDir "password.txt"
    if (Test-Path $passwordFile) { $StorePass = (Get-Content $passwordFile -Raw -Encoding UTF8).Trim() }
}
if (-not $StorePass) { throw "Keystore exists but no password. Set ZAOBIAN_STORE_PASS or pass -StorePass." }

$finalApk = Join-Path $DistRoot $OutputName
& (Join-Path $BuildTools "apksigner.bat") sign `
    --ks $Keystore `
    --ks-key-alias zaobian `
    --ks-pass "pass:$StorePass" `
    --key-pass "pass:$StorePass" `
    --out $finalApk `
    (Join-Path $BuildRoot "aligned.apk")
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

Write-Host "[8/8] Verifying APK..."
& (Join-Path $BuildTools "apksigner.bat") verify --verbose --print-certs $finalApk
if ($LASTEXITCODE -ne 0) { throw "APK signature verification failed" }

& (Join-Path $BuildTools "aapt2.exe") dump badging $finalApk | Select-String -Pattern "^package:|^launchable-activity:|^sdkVersion:|^targetSdkVersion:|^application-label:"

$hash = (Get-FileHash $finalApk -Algorithm SHA256).Hash
$size = [math]::Round((Get-Item $finalApk).Length / 1KB, 1)
Write-Host ""
Write-Host "Output: $finalApk"
Write-Host "Size: $size KB"
Write-Host "SHA256: $hash"