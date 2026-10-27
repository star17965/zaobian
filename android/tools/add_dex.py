import sys
import zipfile

base_apk, dex_path, out_apk = sys.argv[1:4]

with zipfile.ZipFile(base_apk, "r") as src:
    entries = [(info, src.read(info.filename)) for info in src.infolist()]

with zipfile.ZipFile(out_apk, "w") as dst:
    for info, data in entries:
        new_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        new_info.compress_type = info.compress_type
        new_info.external_attr = info.external_attr
        dst.writestr(new_info, data)
    dst.write(dex_path, "classes.dex", compress_type=zipfile.ZIP_DEFLATED)

print("assembled", out_apk)