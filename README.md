# AP World Flashcards

Flashcard decks built from the "AP WORLD FORMULA" binder: Quick review (fill in the blank), Timeline, Formation, Expansion, Collapse, Belief systems, Legitimacy, Centralization, plus an "Everything mixed" deck.

Each deck can be studied in order or shuffled, filtered by region, and answered two ways:

- **Multiple choice:** after you answer, every option shows why it's right or wrong, and you can tap the others to read their explanations.
- **Free response:** type your answer in your own words. With an API key, AI grades it against your notes and lists what you got right, what you missed, and what's wrong. Without a key, it checks which notes your answer covers using keyword matching.

## Put it on GitHub Pages

1. Create a new public repository on GitHub (for example `ap-world-flashcards`).
2. Click **Add file > Upload files** and upload `index.html`, `styles.css`, `app.js`, `data.js`, and this README. Commit.
3. Go to **Settings > Pages**. Under "Build and deployment," set Source to **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, and save.
4. After a minute or two, your site is live at `https://YOUR-USERNAME.github.io/ap-world-flashcards/`.

## Turn on AI grading

Open the site and click **AI grading** in the top right.

- **Google Gemini:** get a free key at https://aistudio.google.com/apikey and paste it in.
- **Claude:** create a key at https://console.anthropic.com/ (paid per use).

The key is saved only in your browser on that device. **Never put your API key in any file you upload to GitHub**, since anyone could see it there. If a model name stops working, change it in the settings to a current model from the provider's model list.

## Add or edit notes

All the notes live in `data.js`. The format is simple:

```
# Deck name | key
## REGION
### State or topic name
- one note
- another note
```

For the Timeline deck, write `- Name: dates` directly under a region. Save, re-upload `data.js` to GitHub, and the site updates.

In the Quick review section, put `[[double brackets]]` around the key term in a note to make it a fill-in-the-blank card. Notes without brackets still show up in your notes but don't become cards.

In the Centralization section, write the label after the name: `### Inca Empire | Highly centralized`. The label becomes the answer to "How was political power organized in this state?"

To add a brand-new deck, add a section like `# Economy | economy` with the same layout. It works automatically; add matching question wording to the `CFG` object near the top of `app.js` if you want custom prompts.
