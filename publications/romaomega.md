---
id: romaomega-2026
title: "RoMa-Ω: What Feed-Forward 3D Models Know About Image Matching"
authors: "<a href='https://www.davnords.com' target='_blank'>David Nordström</a>, <a href='https://scholar.google.fi/citations?user=WvixLxcAAAAJ' target='_blank'>Xinyue Zhang</a>, <a href='https://thibautloiseau.github.io/' target='_blank'><u>Thibaut Loiseau</u></a>, <a href='https://vincentlepetit.github.io' target='_blank'>Vincent Lepetit</a>, <a href='https://fredkahl.github.io/' target='_blank'>Fredrik Kahl</a>"
venue: "ECCV Workshops - SfM-ADL"
year: 2026
thumbnail: "assets/images/publications/romaomega-thumbnail.png"
links:
  paper: "arxiv.org/abs/2609.09507"
  code: "github.com/davnords/RoMa-Omega"
  bibtex: "assets/bibtex/romaomega-2026.bib"
---

Learned image matching has experienced significant progress in recent years, culminating in robust and accurate matchers such as RoMa, whose robustness is often attributed to its use of frozen DINO features. In a parallel development, feed-forward reconstruction models, such as VGGT, have been trained on ever-growing datasets to accurately regress dense 3D point maps and camera poses. The distinction between matchers and feed-forward reconstruction models has become increasingly blurred with the introduction of matching losses in models such as MASt3R and VGGT-Ω. This raises a natural question: what do feed-forward 3D models know about image matching? In this work, we answer this question by analyzing three scenarios: (i) zero-shot matching of patch features, (ii) direct matching of 3D point predictions, and (iii) training a full matcher on top of the learned representations. We find that, despite performing poorly in zero-shot matching, especially in later layers, feed-forward reconstruction models provide strong representations for linear probing and full matching pipelines. We further show that, even without any training, their raw predictions alone enable competitive matching, albeit only under moderate viewpoint changes and modality gaps. Based on these insights, we retrain RoMa v2 by replacing its DINO backbone with VGGT-Ω. Our resulting model, RoMa-Ω, outperforms state-of-the-art matchers on a wide range of benchmarks, e.g. +8.1 mAA compared to RoMa v2 on WxBS.
