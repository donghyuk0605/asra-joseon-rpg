#!/usr/bin/env python3
"""Audit every active monster atlas against the fixed 8x5 runtime contract."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
COVERAGE_PATH = ROOT / "docs/graphics/visual-coverage.generated.json"
JSON_OUT = ROOT / "docs/graphics/monster-atlas-audit.generated.json"
MARKDOWN_OUT = ROOT / "docs/graphics/MONSTER_ATLAS_AUDIT.md"
FRAME_SIZE = 256
ROWS = 5
COLS = 8
EXPECTED_SIZE = (COLS * FRAME_SIZE, ROWS * FRAME_SIZE)
ALPHA_THRESHOLD = 16
FOOTLINE_MAX_Y = 248
MAX_CONTENT = 232


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Exit non-zero when an active atlas violates the contract")
    return parser.parse_args()


def opaque_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = frame.getchannel("A")
    return alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0).getbbox()


def frame_hash(frame: Image.Image) -> str:
    return hashlib.sha256(frame.tobytes()).hexdigest()


def main() -> None:
    args = parse_args()
    coverage = json.loads(COVERAGE_PATH.read_text(encoding="utf-8"))
    kinds_by_path: dict[str, list[str]] = {}
    keys_by_path: dict[str, str] = {}
    for monster in coverage["monsters"]:
        path = monster["asset"]["path"]
        kinds_by_path.setdefault(path, []).append(monster["kind"])
        keys_by_path[path] = monster["asset"]["key"]

    atlases: list[dict[str, object]] = []
    total_frames = 0
    empty_frames = 0
    footline_frames = 0
    compliant_atlases = 0
    violations: list[str] = []

    for asset_path in sorted(kinds_by_path):
        disk_path = ROOT / "public" / asset_path.lstrip("/")
        with Image.open(disk_path) as opened:
            atlas = opened.convert("RGBA")

        dimension_ok = atlas.size == EXPECTED_SIZE
        frame_metrics: list[dict[str, int | None]] = []
        walk_distinct_by_row: list[int] = []
        attack_distinct_by_row: list[int] = []
        max_width = 0
        max_height = 0
        atlas_empty = 0
        atlas_footline = 0

        if dimension_ok:
            for row in range(ROWS):
                hashes: list[str] = []
                for column in range(COLS):
                    frame = atlas.crop((
                        column * FRAME_SIZE,
                        row * FRAME_SIZE,
                        (column + 1) * FRAME_SIZE,
                        (row + 1) * FRAME_SIZE,
                    ))
                    bbox = opaque_bbox(frame)
                    hashes.append(frame_hash(frame))
                    total_frames += 1
                    if bbox is None:
                        atlas_empty += 1
                        empty_frames += 1
                        frame_metrics.append({"row": row, "column": column, "maxY": None, "width": 0, "height": 0})
                        continue
                    width = bbox[2] - bbox[0]
                    height = bbox[3] - bbox[1]
                    max_y = bbox[3] - 1
                    max_width = max(max_width, width)
                    max_height = max(max_height, height)
                    if max_y == FOOTLINE_MAX_Y:
                        atlas_footline += 1
                        footline_frames += 1
                    frame_metrics.append({"row": row, "column": column, "maxY": max_y, "width": width, "height": height})
                walk_distinct_by_row.append(len(set(hashes[:4])))
                attack_distinct_by_row.append(len(set(hashes[4:])))

        reasons: list[str] = []
        if not dimension_ok:
            reasons.append(f"sheet {atlas.width}x{atlas.height}")
        if atlas_empty:
            reasons.append(f"empty frames {atlas_empty}")
        if dimension_ok and atlas_footline != ROWS * COLS:
            reasons.append(f"footline {atlas_footline}/{ROWS * COLS}")
        if max_width > MAX_CONTENT or max_height > MAX_CONTENT:
            reasons.append(f"content {max_width}x{max_height}")
        if walk_distinct_by_row and min(walk_distinct_by_row) < 4:
            reasons.append(f"walk distinct min {min(walk_distinct_by_row)}/4")
        # A repeated strike frame is allowed as hit-stop, but a one-pose attack is not.
        if attack_distinct_by_row and min(attack_distinct_by_row) < 3:
            reasons.append(f"attack distinct min {min(attack_distinct_by_row)}/4")

        compliant = not reasons
        if compliant:
            compliant_atlases += 1
        else:
            violations.append(f"{asset_path}: {', '.join(reasons)}")

        atlases.append({
            "assetKey": keys_by_path[asset_path],
            "path": asset_path,
            "kinds": sorted(kinds_by_path[asset_path]),
            "dimensions": {"width": atlas.width, "height": atlas.height},
            "frames": ROWS * COLS if dimension_ok else 0,
            "emptyFrames": atlas_empty,
            "footlineFrames": atlas_footline,
            "maxContent": {"width": max_width, "height": max_height},
            "walkDistinctMin": min(walk_distinct_by_row, default=0),
            "attackDistinctMin": min(attack_distinct_by_row, default=0),
            "compliant": compliant,
            "violations": reasons,
            "frameMetrics": frame_metrics,
        })

    reuse_counts = Counter(len(kinds) for kinds in kinds_by_path.values())
    payload = {
        "schemaVersion": 1,
        "contract": {
            "sheet": "2048x1280",
            "grid": "8x5",
            "frame": "256x256",
            "walkColumns": "0-3",
            "attackColumns": "4-7",
            "footlineMaxY": FOOTLINE_MAX_Y,
            "maxContent": MAX_CONTENT,
            "alphaThreshold": ALPHA_THRESHOLD,
        },
        "summary": {
            "monsterKinds": len(coverage["monsters"]),
            "uniqueAtlases": len(atlases),
            "totalFrames": total_frames,
            "emptyFrames": empty_frames,
            "footlineFrames": footline_frames,
            "compliantAtlases": compliant_atlases,
            "violatingAtlases": len(atlases) - compliant_atlases,
            "sharedAtlasGroups": sum(1 for kinds in kinds_by_path.values() if len(kinds) > 1),
            "dedicatedAtlases": sum(1 for kinds in kinds_by_path.values() if len(kinds) == 1),
        },
        "reuseDistribution": {str(count): groups for count, groups in sorted(reuse_counts.items())},
        "atlases": atlases,
    }
    JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# 몬스터 액션 아틀라스 전수 감사",
        "",
        "> 자동 생성 문서입니다. `npm run audit:graphics`로 갱신합니다.",
        "",
        "## 고정 규격",
        "",
        "- 전체 시트 `2048×1280`, `8열×5행`, 셀 `256×256`",
        "- 0–3열 걷기, 4–7열 공격",
        f"- 알파 `{ALPHA_THRESHOLD}` 초과 픽셀 기준 발바닥 최하단 `y={FOOTLINE_MAX_Y}`(셀 하단 7px)",
        f"- 프레임 콘텐츠 최대 `{MAX_CONTENT}×{MAX_CONTENT}px`",
        "- 걷기 행별 4개 포즈, 공격 행별 최소 3개 포즈(타격 유지 1프레임 중복 허용)",
        "",
        "## 전체 결과",
        "",
        f"- 몬스터 종류: **{len(coverage['monsters'])}종**",
        f"- 실제 활성 아틀라스: **{len(atlases)}개 / {total_frames}프레임**",
        f"- 완전 규격 통과: **{compliant_atlases}/{len(atlases)}개**",
        f"- 빈 프레임: **{empty_frames}개**",
        f"- 발선 일치: **{footline_frames}/{total_frames}프레임**",
        f"- 여러 종이 공유하는 아틀라스: **{payload['summary']['sharedAtlasGroups']}그룹**",
        "",
        "## 아틀라스별 판정",
        "",
        "| 자산 | 연결 몬스터 | 발선 | 최대 영역 | 걷기 | 공격 | 판정 |",
        "|---|---:|---:|---:|---:|---:|---|",
    ]
    for atlas in atlases:
        name = str(atlas["path"]).rsplit("/", 1)[-1]
        max_content = atlas["maxContent"]
        result = "통과" if atlas["compliant"] else " / ".join(atlas["violations"])
        lines.append(
            f"| `{name}` | {len(atlas['kinds'])}종 | {atlas['footlineFrames']}/40 | "
            f"{max_content['width']}×{max_content['height']} | {atlas['walkDistinctMin']}/4 | "
            f"{atlas['attackDistinctMin']}/4 | {result} |"
        )
    lines.extend([
        "",
        "## 해석 원칙",
        "",
        "- 이 문서는 파일 존재 여부가 아니라 실제 알파 픽셀과 프레임 차이를 검사합니다.",
        "- 공격 4프레임 중 동일한 타격 포즈 1회를 유지하는 것은 히트스톱 표현으로 허용합니다.",
        "- 여러 몬스터가 같은 시트를 쓰는 항목은 규격 통과와 별개로 실루엣 중복 개선 대상입니다.",
        "- 생성 원본은 이 검사와 브라우저 플레이 검증을 통과하기 전 런타임에 넣지 않습니다.",
        "",
    ])
    MARKDOWN_OUT.write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    if violations:
        print("\n".join(violations))
    if args.check and violations:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
