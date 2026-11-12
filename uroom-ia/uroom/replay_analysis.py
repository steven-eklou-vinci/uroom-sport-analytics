"""Rejoue l'analyse (identités, ballon, touches, passes) sur des détections déjà calculées.

Pas besoin de relancer YOLO : ``raw_detections.npz`` est écrit à côté de la vidéo par
analyze_video. Une analyse prend quelques secondes, donc on peut régler les seuils
en regardant l'entonnoir de détection.

    python -m uroom.replay_analysis chemin/raw_detections.npz
    python -m uroom.replay_analysis chemin/raw_detections.npz --min-change 2.5 --ambiguity 0.9

Lecture de l'entonnoir (section « diagnostic ») :
  * ball.coveragePct bas (< 15 %)      -> le problème est la DÉTECTION du ballon
                                          (modèle, imgsz, conf) ; les seuils n'y feront rien
  * touchEvents.detected bas           -> baisse --min-change
  * touchEvents.unattributed élevé     -> le ballon est loin des pieds : monte --max-ratio
  * touchEvents.contested élevé        -> monte --ambiguity (ex. 0.9) ou accepte l'incertitude
  * pairsNotCounted.sameGid élevé      -> le même joueur touche plusieurs fois (normal), ou ses
                                          fragments ont des identités différentes
  * passes.uncertain élevé             -> touches contestées ou équipes inconnues
"""

from __future__ import annotations

import argparse
import json

from .match_analysis import analyse_match, load_raw_detections


def _clock(frame: int, fps: float) -> str:
    seconds = frame / fps
    return f"{int(seconds // 60):02d}:{seconds % 60:05.2f}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("raw", help="raw_detections.npz")
    parser.add_argument("--min-change", type=float, default=3.5,
                        help="variation de vitesse minimale du ballon (hauteurs de joueur / s) pour une touche")
    parser.add_argument("--max-obs-gap", type=int, default=12, help="trou max (images) entre deux détections du ballon")
    parser.add_argument("--max-ratio", type=float, default=0.6, help="distance max ballon-pieds (en hauteurs de joueur)")
    parser.add_argument("--ambiguity", type=float, default=0.75,
                        help="plus haut = moins de touches « contestées » (0.9 : seulement si presque à égalité)")
    parser.add_argument("--max-gap", type=float, default=3.0, help="durée max (s) entre deux touches d'une même passe")
    parser.add_argument("--min-track-seconds", type=float, default=0.5)
    parser.add_argument("--none-breaks-chain", action="store_true")
    parser.add_argument("--list", action="store_true", help="affiche chaque touche et chaque passe")
    parser.add_argument("--json", action="store_true", help="sortie JSON")
    args = parser.parse_args()

    frames, balls, fps = load_raw_detections(args.raw)
    analysis = analyse_match(
        frames, balls, fps,
        min_track_seconds=args.min_track_seconds,
        touch_params={"min_change_heights_per_s": args.min_change, "max_obs_gap_frames": args.max_obs_gap},
        attribution_params={"max_ratio": args.max_ratio, "ambiguity": args.ambiguity},
        pass_params={"max_gap_s": args.max_gap, "none_breaks_chain": args.none_breaks_chain},
    )
    report = analysis.diagnostics()
    if args.json:
        print(json.dumps({"diagnostics": report, "passEvents": analysis.pass_events}, indent=2, default=str))
        return

    print(f"{len(frames)} frames @ {fps:.1f} fps ({_clock(len(frames), fps)})\n")
    print("=== diagnostic ===")
    for section, values in report.items():
        if isinstance(values, dict):
            print(f"{section}:")
            for key, value in values.items():
                print(f"    {key:<24}{value}")
        else:
            print(f"{section:<28}{values}")
    if args.list:
        print("\n=== touches ===")
        for touch in analysis.touches:
            who = f"#{touch.gid}" if touch.gid is not None else "—"
            rival = f" (rival #{touch.runner_up})" if touch.quality == "contested" else ""
            print(f"{_clock(touch.frame, fps)}  frame {touch.frame:>6}  {who:<6}{touch.quality:<10}force {touch.strength:4.1f}{rival}")
        print("\n=== passes ===")
        for event in analysis.pass_events:
            print(f"{_clock(event['frame'], fps)}  #{event['from']} -> #{event['to']}  {event['outcome']:<10}"
                  f"({event['fromQuality']}/{event['toQuality']})")


if __name__ == "__main__":
    main()
