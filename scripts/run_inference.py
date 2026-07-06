"""
YOLO 가중치(.pt)로 축구 영상을 프레임 단위로 분석해
HaptiBall 프로젝트가 쓰는 detection.json 포맷으로 저장하는 스크립트.

CPU 전용 환경에서 오래 걸릴 수 있어 "시간 예산(time budget)" 안에서만 처리하고
중단된 지점부터 이어서 재실행할 수 있도록 체크포인트를 남긴다.

사용법 (여러 번 반복 실행해서 끝까지 이어감):
    python run_inference.py <weight.pt> <video.mp4> <work_dir> --budget 280

work_dir 안에:
    state.json   - 다음에 처리할 프레임 인덱스
    frames.jsonl - 지금까지 처리된 프레임 결과 (한 줄에 하나씩, append)

전부 끝나면 --finalize 옵션으로 work_dir/frames.jsonl 을 최종 detection.json 으로 합침:
    python run_inference.py --finalize <work_dir> <output.json>
"""

import argparse
import json
import os
import sys
import time

import cv2


def load_state(work_dir):
    state_path = os.path.join(work_dir, "state.json")
    if os.path.exists(state_path):
        with open(state_path) as f:
            return json.load(f)
    return {"next_idx": 0, "fps": None, "width": None, "height": None, "total": None}


def save_state(work_dir, state):
    state_path = os.path.join(work_dir, "state.json")
    with open(state_path, "w") as f:
        json.dump(state, f)


def run_chunk(weight, video, work_dir, budget, conf, imgsz):
    from ultralytics import YOLO

    os.makedirs(work_dir, exist_ok=True)
    state = load_state(work_dir)

    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        print(f"영상을 열 수 없습니다: {video}", file=sys.stderr)
        sys.exit(1)

    if state["fps"] is None:
        state["fps"] = cap.get(cv2.CAP_PROP_FPS) or 30
        state["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        state["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        state["total"] = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        save_state(work_dir, state)

    fps = state["fps"]
    total = state["total"]
    next_idx = state["next_idx"]

    if next_idx >= total:
        print(f"이미 전체 {total}프레임 처리 완료. --finalize 로 합치세요.")
        return

    print("모델 로드 중...", flush=True)
    model = YOLO(weight)

    cap.set(cv2.CAP_PROP_POS_FRAMES, next_idx)
    frames_path = os.path.join(work_dir, "frames.jsonl")

    t_start = time.time()
    processed_this_run = 0
    idx = next_idx

    with open(frames_path, "a", encoding="utf-8") as fout:
        while idx < total:
            if time.time() - t_start > budget:
                break
            ok, frame = cap.read()
            if not ok:
                break

            t = idx / fps
            results = model.predict(frame, imgsz=imgsz, conf=conf, verbose=False)
            r = results[0]
            if len(r.boxes) > 0:
                best_i = int(r.boxes.conf.argmax())
                box = r.boxes.xyxy[best_i].tolist()
                bconf = float(r.boxes.conf[best_i])
                cx = (box[0] + box[2]) / 2
                cy = (box[1] + box[3]) / 2
                rec = {"t": round(t, 3), "x": round(cx, 1), "y": round(cy, 1), "conf": round(bconf, 3)}
            else:
                rec = {"t": round(t, 3), "x": None, "y": None}

            fout.write(json.dumps(rec) + "\n")
            fout.flush()

            idx += 1
            processed_this_run += 1
            state["next_idx"] = idx
            if processed_this_run % 5 == 0:
                save_state(work_dir, state)

    save_state(work_dir, state)
    cap.release()

    elapsed = time.time() - t_start
    rate = processed_this_run / elapsed if elapsed > 0 else 0
    remaining = total - idx
    eta_min = (remaining / rate / 60) if rate > 0 else float("inf")
    print(
        f"이번 실행: {processed_this_run}프레임 처리 ({elapsed:.0f}초, {rate:.2f} frame/s)\n"
        f"전체 진행: {idx}/{total} ({idx/total*100:.1f}%)\n"
        f"남은 프레임: {remaining} | 예상 남은 시간: 약 {eta_min:.1f}분 (같은 속도 기준)",
        flush=True,
    )
    if idx >= total:
        print("=== 전체 완료! --finalize 로 최종 JSON을 만드세요 ===")


def finalize(work_dir, output):
    state = load_state(work_dir)
    frames_path = os.path.join(work_dir, "frames.jsonl")
    frames = []
    with open(frames_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                frames.append(json.loads(line))

    out = {
        "fps": state["fps"],
        "width": state["width"],
        "height": state["height"],
        "frames": frames,
    }
    with open(output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    detected = sum(1 for fr in frames if fr["x"] is not None)
    print(f"완료: {len(frames)}프레임 중 {detected}프레임 탐지됨 ({detected/len(frames)*100:.1f}%)")
    print(f"저장됨: {output}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--finalize", action="store_true", help="지금까지 처리된 결과를 최종 detection.json으로 합치기")
    parser.add_argument("args", nargs="*")
    parser.add_argument("--budget", type=float, default=280, help="이번 실행에서 쓸 시간(초). 기본 280초")
    parser.add_argument("--conf", type=float, default=0.15)
    parser.add_argument("--imgsz", type=int, default=1280)
    parsed = parser.parse_args()

    if parsed.finalize:
        work_dir, output = parsed.args
        finalize(work_dir, output)
    else:
        weight, video, work_dir = parsed.args
        run_chunk(weight, video, work_dir, parsed.budget, parsed.conf, parsed.imgsz)


if __name__ == "__main__":
    main()
