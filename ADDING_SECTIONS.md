# How to Add a New Person/Section

## Quick Steps

1. **Create a new folder** in `pages/`:
   ```
   pages/[person-name]/
   ```

2. **Copy the template** from `pages/fredrik/index.html` and customize:
   - Update the title in `<h1>` tag
   - Update the subtitle
   - Add their projects in the grid
   - Update footer text

3. **Add a card to main landing page** (`index.html`):
   ```html
   <div class="project-card">
       <div class="project-icon">👤</div>
       <h2>[Person Name]'s Projects</h2>
       <p>Brief description of their work...</p>
       <a href="pages/[person-name]/index.html" class="btn">View Projects</a>
   </div>
   ```

## Project Card Template

For adding projects to a person's page:

```html
<div class="project-card">
    <div class="project-icon">[emoji]</div>
    <h2>Project Title</h2>
    <p>Project description...</p>
    <a href="../../projects/[project-folder]/index.html" class="btn">View Project</a>
</div>
```

## Directory Structure

```
Portfolio/
├── index.html                    # Main landing with person cards
├── css/styles.css               # Shared styles (already exists)
├── pages/
│   ├── fredrik/                 # Example person section
│   │   └── index.html
│   └── [new-person]/
│       └── index.html
└── projects/
    ├── finance-news/            # Existing project
    └── [new-project]/
        └── index.html
```

## Tips

- Keep the gradient theme consistent across all pages
- Use emoji icons for visual appeal (📰 🚀 💻 🎨 etc.)
- Always include a "Back to Home" button on person pages
- Projects can be shared across multiple people if needed
