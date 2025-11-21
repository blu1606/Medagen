import os
import re
import unicodedata
from pathlib import Path
import pdfplumber

# ===============================================
# CONFIG
# ===============================================

PDF_PATH = Path("data/Rang_Ham_Mat.pdf")
SPECIALTY_FOLDER = "Răng Hàm Mặt"   # folder chuyên khoa (config)
ENABLE_DEBUG = False

# ===============================================
# TOC STRUCTURE (CHAPTERS + DISEASES)
# ===============================================

CHAPTERS = [
    ("CHƯƠNG 1. BỆNH DA NHIỄM KHUẨN", 8),
    ("CHƯƠNG 2. BỆNH DA DO KÝ SINH TRÙNG – CÔN TRÙNG", 40),
    ("CHƯƠNG 3. BỆNH DA DO VI RÚT", 67),
    ("CHƯƠNG 4. BỆNH DA TỰ MIỄN", 81),
    ("CHƯƠNG 5. BỆNH DA DỊ ỨNG – MIỄN DỊCH", 114),
    ("CHƯƠNG 6. BỆNH ĐỎ DA CÓ VẢY", 154),
    ("CHƯƠNG 7. BỆNH LÂY TRUYỀN QUA ĐƯỜNG TÌNH DỤC", 185),
    ("CHƯƠNG 8. U DA", 221),
    ("CHƯƠNG 9. CÁC BỆNH DA DI TRUYỀN", 241),
    ("CHƯƠNG 10. RỐI LOẠN SẮC TỐ", 281),
    ("CHƯƠNG 11. CÁC BỆNH DA KHÁC", 293),
]

# BỆNH cuối cùng có end_page riêng
DISEASES = [
    ("1. BỆNH CHỐC", 8),
    ("2. NHỌT", 13),
    ("3. VIÊM NANG LÔNG", 16),
    ("4. HỘI CHỨNG BONG VẢY DA DO TỤ CẦU", 20),
    ("5. TRỨNG CÁ", 23),
    ("6. BỆNH LAO DA", 28),
    ("7. BỆNH PHONG", 34),
    ("8. BỆNH GHẺ", 40),
    ("9. LANG BEN", 43),
    ("10. BỆNH DA DO NẤM SỢI", 46),
    ("11. BỆNH DA VÀ NIÊM MẠC DO CANDIDA", 50),
    ("12. NẤM TÓC", 55),
    ("13. NẤM MÓNG", 60),
    ("14. VIÊM DA TIẾP XÚC DO CÔN TRÙNG", 64),

    ("15. BỆNH ZONA", 67),
    ("16. BỆNH HẠT CƠM", 72),
    ("17. U MỀM LÂY", 77),

    ("18. BỆNH LUPUS BAN ĐỎ", 81),
    ("19. VIÊM BÌ CƠ", 88),
    ("20. PEMPHIGUS", 92),
    ("21. BỌNG NƯỚC DẠNG PEMPHIGUS", 98),
    ("22. BỆNH VIÊM DA DẠNG HERPES CỦA DUHRING-BROCQ", 103),
    ("23. HỘI CHỨNG RAYNAUD", 107),

    ("24. VIÊM DA CƠ ĐỊA", 114),
    ("25. VIÊM DA TIẾP XÚC DỊ ỨNG", 119),
    ("26. HỘI CHỨNG DRESS", 123),
    ("27. HỒNG BAN ĐA DẠNG", 127),
    ("28. HỘI CHỨNG STEVENS- JOHNSON", 133),
    ("29. HỘI CHỨNG LYELL", 139),
    ("30. SẨN NGỨA", 145),
    ("31. BỆNH MÀY ĐAY", 149),

    ("32. VIÊM DA DẦU", 154),
    ("33. VẢY PHẤN HỒNG GIBERT", 157),
    ("34. BỆNH VẢY NẾN", 161),
    ("35. Á VẢY NẾN VÀ VẢY PHẤN DẠNG LICHEN", 167),
    ("36. ĐỎ DA TOÀN THÂN", 173),
    ("37. BỆNH LICHEN PHẲNG", 180),

    ("38. BỆNH GIANG MAI", 185),
    ("39. BỆNH LẬU", 194),
    ("40. VIÊM ÂM HỘ-ÂM ĐẠO DO NẤM CANDIDA", 198),
    ("41. HERPES SINH DỤC", 202),
    ("42. NHIỄM CHLAMYDIA TRACHOMATIS SINH DỤC-TIẾT NIỆU", 205),
    ("43. VIÊM ÂM ĐẠO DO TRÙNG ROI", 211),
    ("44. BỆNH SÙI MÀO GÀ SINH DỤC", 215),

    ("45. UNG THƯ TẾ BÀO ĐÁY", 221),
    ("46. UNG THƯ TẾ BÀO VẢY", 226),
    ("47. UNG THƯ TẾ BÀO HẮC TỐ", 232),
    ("48. U ỐNG TUYẾN MỒ HÔI", 238),

    ("49. DÀY SỪNG LÒNG BÀN TAY, BÀN CHÂN DI TRUYỀN", 241),
    ("50. LY THƯỢNG BÌ BỌNG NƯỚC BẨM SINH", 244),
    ("51. BỆNH VẢY PHẤN ĐỎ NANG LÔNG", 250),
    ("52. U XƠ THẦN KINH", 255),
    ("53. BỆNH GAI ĐEN", 259),
    ("54. DỊ SỪNG NANG LÔNG", 264),
    ("55. BỆNH VẢY CÁ", 267),
    ("56. VIÊM DA ĐẦU CHI- RUỘT", 274),
    ("57. SARCOIDOSIS", 277),

    ("58. BỆNH BẠCH BIẾN", 281),
    ("59. SẠM DA", 285),
    ("60. RÁM MÁ", 289),

    ("61. BỆNH APTHOSE", 293),
    ("62. BỆNH DA DO ÁNH SÁNG", 297),
    ("63. BỆNH PORPHYRIN DA", 301),
    ("64. BỆNH DA NGHỀ NGHIỆP", 305),

    ("65. BỆNH PELLAGRA", 312, 315),
]

# ===============================================
# TEXT NORMALIZATION (FIX PDF ENCODING ERRORS)
# ===============================================

REPLACEMENTS = {
    "Ƣ": "Ư",
    "ƣ": "ư",
    "PHÕNG": "PHÒNG",
    "PHÕM": "PHÒM",
}

PAGE_NUMBER_PATTERN = re.compile(r"^\s*\d+\s*$")

def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    for wrong, right in REPLACEMENTS.items():
        s = s.replace(wrong, right)
    return s


# ===============================================
# HELPERS
# ===============================================

def safe_slug(text: str) -> str:
    s = normalize_text(text)
    # Replace underscores/double underscores with spaces
    s = s.replace("__", " ")
    s = s.replace("_", " ")
    # Normalize spaces
    s = re.sub(r"\s+", " ", s.strip())
    # Replace slashes with hyphen to keep filesystem safe
    s = s.replace("/", "-").replace("\\", "-")
    # Remove characters outside word chars, spaces, hyphen, parentheses
    s = re.sub(r"[^\w\s\-\(\)]+", "", s)
    return s.strip()


def clean_heading_title(text: str, remove_chapter_keyword: bool = False) -> str:
    s = normalize_text(text)
    if remove_chapter_keyword:
        s = re.sub(r"^(CH(U|Ư)ƠNG)\s*\d+[\.\-:\s]*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"^\d+[\.\-:\s]+", "", s)
    return s.strip(" .:-_")


def remove_page_number_lines(text: str) -> str:
    cleaned_lines = []
    for line in text.splitlines():
        if PAGE_NUMBER_PATTERN.match(line.strip()):
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def find_chapter(page: int):
    chosen = None
    for chapter, start in CHAPTERS:
        if start <= page:
            chosen = chapter
        else:
            break
    return chosen or "CHƯƠNG_KHÁC"


# ===============================================
# 1. SPLIT PDF → DISEASE SECTIONS (only used as input)
# ===============================================

def extract_disease_sections(pdf_path: Path):
    if SPECIALTY_FOLDER:
        specialty = SPECIALTY_FOLDER
    else:
        specialty = safe_slug(pdf_path.stem.split("-")[-1])

    root = pdf_path.parent / specialty
    root.mkdir(exist_ok=True)

    with pdfplumber.open(str(pdf_path)) as pdf:
        total = len(pdf.pages)

        for i, entry in enumerate(DISEASES):
            title = entry[0]
            start = entry[1]
            end = entry[2] if len(entry) > 2 else (
                DISEASES[i + 1][1] - 1 if i + 1 < len(DISEASES) else start
            )

            start_idx = start
            end_idx = min(end, total - 1)

            chapter = find_chapter(start)
            chapter_clean = clean_heading_title(chapter, remove_chapter_keyword=True) or chapter
            chapter_dir = root / safe_slug(chapter_clean)
            chapter_dir.mkdir(parents=True, exist_ok=True)

            disease_clean = clean_heading_title(title) or title
            disease_dir = chapter_dir / safe_slug(disease_clean)
            disease_dir.mkdir(parents=True, exist_ok=True)

            txt_raw = ""
            for p in range(start_idx, end_idx + 1):
                txt_raw += (pdf.pages[p].extract_text() or "") + "\n"

            txt_raw = remove_page_number_lines(txt_raw)
            # Save temporary disease text (not final output)
            (disease_dir / "_raw.txt").write_text(normalize_text(txt_raw), encoding="utf-8")

    return root


# ===============================================
# 2. SPLIT EACH DISEASE INTO SUBSECTIONS
# ===============================================

def split_into_fields(root_dir: Path):
    for raw_file in root_dir.rglob("_raw.txt"):
        text = raw_file.read_text(encoding="utf-8")
        lines = text.splitlines(keepends=True)

        headings = []
        for i, line in enumerate(lines):
            m = re.match(r"^\s*(\d+)\.\s+(.+)$", line)
            if m:
                num = m.group(1)
                title = normalize_text(m.group(2))
                headings.append((i, num, title))

        if len(headings) < 1:
            continue

        disease_dir = raw_file.parent

        for idx, (start_idx, num, title) in enumerate(headings):
            end_idx = headings[idx + 1][0] if idx + 1 < len(headings) else len(lines)
            section_text = "".join(lines[start_idx:end_idx]).strip()
            if not section_text:
                continue

            section_clean = clean_heading_title(title) or title
            section_slug = safe_slug(section_clean) or f"section_{num}"
            out_file = disease_dir / f"{section_slug}.txt"
            if out_file.exists():
                out_file = disease_dir / f"{section_slug}_{num}.txt"
            out_file.write_text(section_text, encoding="utf-8")

        raw_file.unlink()   # remove raw file


# ===============================================
# MAIN
# ===============================================

if __name__ == "__main__":
    root = extract_disease_sections(PDF_PATH)
    split_into_fields(root)