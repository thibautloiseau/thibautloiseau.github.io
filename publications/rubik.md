---
id: rubik-2025
title: "RUBIK: A Structured Benchmark for Image Matching across Geometric Challenges"
authors: "Thibaut Loiseau, Guillaume Bourmaud"
venue: "CVPR - Main Conference"
year: 2025
thumbnail: "assets/images/publications/rubik-thumbnail.jpg"
links:
  paper: "arxiv.org/abs/2502.19955"
  code: ""
  website: ""
  bibtex: "assets/bibtex/rubik-2025.bib"
---
Camera pose estimation is crucial for many computer vision applications, yet existing benchmarks offer limited insight into method limitations across different geometric challenges. We introduce RUBIK, a novel benchmark that systematically evaluates image matching methods across well-defined geometric difficulty levels. Using three complementary criteria - overlap, scale ratio, and viewpoint angle - we organize 16.5K image pairs from nuScenes into 33 difficulty levels. Our comprehensive evaluation of 14 methods reveals that while recent detector-free approaches achieve the best performance (>47% success rate), they come with significant computational overhead compared to detector-based methods (150-600ms vs. 40-70ms). Even the best performing method succeeds on only 54.8% of the pairs, highlighting substantial room for improvement, particularly in challenging scenarios combining low overlap, large scale differences, and extreme viewpoint changes. Benchmark will be made publicly available.