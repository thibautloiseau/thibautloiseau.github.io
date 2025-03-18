# Setting Up Your Academic Website on GitHub Pages

This guide will walk you through setting up your academic website on GitHub Pages, including how to organize your files and how to add new publications as your research progresses.

## Step 1: Repository Setup

1. Create a new GitHub repository named `username.github.io` (replace `username` with your GitHub username)
2. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/username/username.github.io.git
   cd username.github.io
   ```

## Step 2: Directory Structure

Create the following directory structure:

```
username.github.io/
├── index.html                  # Main HTML file
├── assets/
│   ├── css/
│   │   └── styles.css          # Main stylesheet
│   ├── js/
│   │   └── main.js             # Script to load publications
│   ├── images/
│   │   ├── profile.jpg         # Your profile picture
│   │   └── publications/       # Thumbnails for publications
│   └── bibtex/                 # BibTeX citations for publications
└── publications/               # Markdown files for publications
    ├── list.json               # List of publication files
    ├── rubik.md
    ├── reliability.md
    ├── alligator.md
    └── template.md             # Template for new publications
```

## Step 3: Core Files

### 1. index.html

Use the HTML template provided in the artifact. Make sure to:
- Update your profile information
- Customize the news section
- Add your social media links

### 2. styles.css

Use the CSS provided in the artifact.

### 3. main.js

Use the JavaScript code provided in the artifact.

### 4. publications/list.json

Create a JSON file listing your publication markdown files:

```json
[
  "rubik.md",
  "reliability.md",
  "alligator.md"
]
```

## Step 4: Adding Your Publications

1. Create a markdown file for each publication in the `publications/` directory
2. Follow the template format with YAML frontmatter
3. Add the publication to `publications/list.json`
4. Add BibTeX files to `assets/bibtex/`
5. Add thumbnail images to `assets/images/publications/`

### Publication Markdown Format

```markdown
---
id: unique-id-for-the-paper
title: "Paper Title"
authors: Author 1, Author 2, Author 3
venue: Conference or Journal Name
year: 2025
thumbnail: assets/images/publications/paper-thumbnail.jpg
links:
  paper: https://link-to-paper.pdf
  code: https://github.com/username/repo
  website: https://project-website.com
  bibtex: assets/bibtex/paper-citation.bib
---

Abstract text goes here. This should be the full abstract as it appears in the paper.
```

## Step 5: Add a New Publication (Future)

1. Create a thumbnail image for your paper and save it to `assets/images/publications/`
2. Create a BibTeX file for your paper and save it to `assets/bibtex/`
3. Copy `template.md` to a new file (e.g., `new-paper.md`)
4. Fill in the YAML frontmatter and abstract
5. Add the new file name to `publications/list.json`

Example:

```markdown
---
id: new-paper-2025
title: "My New Paper Title"
authors: Thibaut Loiseau, Coauthor One, Coauthor Two
venue: ICCV 2025
year: 2025
thumbnail: assets/images/publications/new-paper-thumbnail.jpg
links:
  paper: https://arxiv.org/abs/xxxx.xxxxx
  code: https://github.com/yourgithub/new-paper
  website: https://your-project-website.com/new-paper
  bibtex: assets/bibtex/new-paper-2025.bib
---

This is the abstract of my new paper. It describes the contributions and findings of the research...
```

## Step 6: Deploy to GitHub Pages

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Initial website setup"
   git push origin main
   ```

2. Go to your GitHub repository settings:
   - Navigate to Settings > Pages
   - Source section: select "Deploy from a branch"
   - Branch section: select "main" and "/ (root)"
   - Click Save

3. Wait a few minutes for GitHub to build your site
4. Your website will be available at `https://username.github.io`

## Maintenance Tips

1. **Update News Regularly**: Edit the news items in `index.html` to keep your visitors informed about your latest achievements.

2. **Optimize Images**: Compress your images to improve load times. Aim for images under 200KB.

3. **Keep Publications Ordered**: In `publications/list.json`, list your publications in reverse chronological order (newest first).

4. **Custom Domain**: If you want to use a custom domain instead of `username.github.io`, you can set it up in the GitHub Pages settings.

5. **Google Scholar Link**: Make sure to update your Google Scholar ID in the profile section for proper linking.

## Troubleshooting

1. **Images Not Loading**: Ensure path references are correct. All paths should be relative to the root directory.

2. **BibTeX Issues**: Verify that your BibTeX files are properly formatted and the paths in your markdown files are correct.

3. **Markdown Not Parsing**: Check for syntax errors in your YAML frontmatter. Make sure there are three dashes `---` before and after the frontmatter.

4. **Layout Issues**: Test your website on different devices to ensure it's responsive.

5. **GitHub Pages Not Updating**: GitHub Pages can take several minutes to update. If your changes aren't visible after pushing, wait a few minutes and try again.
