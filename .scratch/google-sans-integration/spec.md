# Google Sans integration

Status: ready-for-agent

## Problem Statement

Rootspace currently renders its normal interface text with an Arial-based system font stack. This makes the visual identity feel generic and prevents the application from using Google Sans consistently across its pages. The application also presents both English and Thai content, so a partial font change that covers only Latin characters would create a visibly inconsistent experience. At the same time, some content is intentionally monospaced because it represents code or structured data; a global replacement must not remove that functional distinction.

## Solution

Use the exact Google Sans family as the global sans-serif interface font across Rootspace. Integrate it through the framework's built-in Google Fonts support so font assets are optimized and self-hosted by the application. Include Latin and Thai character support, make every route inherit the font through the application root, and connect the font to the existing global sans-serif design token. Preserve the existing monospace family wherever the interface deliberately marks code or structured data as monospaced. Treat this as a strict font-family change: existing sizes, declared weights, spacing, colors, and layouts remain unchanged.

## User Stories

1. As a Rootspace visitor, I want normal interface text to use Google Sans, so that the application has a more distinctive and cohesive visual identity.
2. As a returning user, I want typography to remain consistent while I navigate between tools, so that Rootspace feels like one application rather than a collection of unrelated pages.
3. As a user opening the home page, I want its navigation, headings, descriptions, controls, and supporting text to use the shared interface font, so that the first impression reflects the intended design.
4. As a user opening the login page, I want authentication content and form controls to use the same interface font as the rest of Rootspace, so that authentication does not feel visually disconnected.
5. As a user opening any current tool page, I want ordinary interface text to inherit Google Sans automatically, so that individual tools do not need inconsistent one-off font rules.
6. As a user opening a future page, I want it to inherit Google Sans from the application shell by default, so that typography stays consistent as Rootspace grows.
7. As a user reading English content, I want Latin characters to render in Google Sans, so that the primary interface language uses the intended typeface.
8. As a user reading generated Thai names, I want Thai characters to render in Google Sans rather than silently falling back to an unrelated system font, so that mixed-language content remains visually coherent.
9. As a user viewing English and Thai text together, I want both writing systems to belong to the same font family, so that mixed-language results do not look patched together.
10. As a user entering or reading JSON, I want JSON content to remain monospaced, so that nesting, punctuation, and structured values remain easy to scan.
11. As a user viewing generated identifiers, dates, or other structured values that are intentionally monospaced, I want those values to retain their monospace presentation, so that their technical character remains clear.
12. As a user reading small technical labels that are intentionally monospaced, I want them to remain visually distinct from ordinary interface copy, so that the existing information hierarchy is preserved.
13. As a user interacting with buttons, inputs, text areas, and selects, I want their ordinary text to inherit the global interface font, so that controls match the surrounding page.
14. As a user viewing Rootspace at different screen sizes, I want the font change to preserve the current responsive layout, so that typography does not break navigation or tool content.
15. As a user relying on the current visual hierarchy, I want font sizes and declared font weights to remain unchanged, so that headings, labels, and body copy retain their relative emphasis.
16. As a user familiar with the current interface, I want spacing, colors, borders, and component geometry to remain unchanged, so that the update feels like a focused typography improvement rather than a redesign.
17. As a user loading the application, I want readable fallback text to appear while the webfont becomes available, so that content is not hidden behind font loading.
18. As a privacy-conscious user, I want the application to serve its production font assets itself rather than contacting Google Fonts from my browser at runtime, so that viewing Rootspace does not add a third-party font request.
19. As a user on a constrained connection, I want only the character coverage and font styles needed by the application to be included, so that the typography update avoids unnecessary transfer cost.
20. As a developer maintaining Rootspace, I want the interface font configured at one global seam, so that I do not have to edit every page or component when typography changes.
21. As a developer maintaining shared UI components, I want the existing sans-serif utility to resolve to Google Sans, so that components using the design token adopt the font without local overrides.
22. As a developer working with code and structured-data components, I want the monospace design token to remain independent, so that future global sans-serif changes cannot accidentally erase code-oriented typography.
23. As a developer deploying Rootspace, I want the production build to validate and package the font integration, so that missing font configuration fails before deployment rather than in a user's browser.
24. As a product owner, I want representative English, Thai, ordinary UI, and monospaced content checked together, so that acceptance covers the meaningful typography boundaries rather than only the home page.

## Implementation Decisions

- Use the exact Google Sans family, not Google Sans Flex or Product Sans.
- Use the framework's built-in Google Fonts integration. Do not add a new font package, a hand-written remote stylesheet, or a runtime Google Fonts request.
- Configure the font once at the application root so every existing and future route inherits it by default.
- Expose Google Sans through a global CSS variable and make the existing sans-serif design token resolve to that variable.
- Make the document's default body typography resolve to the shared sans-serif design token rather than retaining a separate Arial declaration.
- Include both Latin and Thai subsets because the product renders both English interface copy and Thai generated data.
- Use the variable normal style supported by Google Sans so the existing interface weight declarations continue to work without editing component-level weight utilities.
- Use swap-style font display behavior so readable fallback text remains visible during font loading.
- Retain an appropriate sans-serif fallback stack for cases where the optimized font asset cannot be used.
- Preserve the existing monospace design token and every intentional monospace utility usage. JSON, identifiers, dates, structured values, and technical labels remain monospaced.
- Do not add page-specific Google Sans classes. The root layout and shared design token are the single ownership seam.
- Do not alter component markup merely to propagate the font; inheritance and the existing font utilities should do that work.
- Do not change current font sizes, declared weights, line heights, letter spacing, responsive breakpoints, colors, or layout geometry.
- Do not introduce environment variables, API changes, database changes, schema changes, or new runtime configuration.
- Production font files must be emitted and served by the application rather than fetched from Google by the user's browser.

## Testing Decisions

- The primary test seam is the rendered application at the root layout. This is the highest seam that owns typography for every route and avoids duplicating tests across individual pages.
- A good acceptance check observes user-visible rendered behavior: the computed font family, correct glyph rendering, preservation of monospace regions, successful font loading, and absence of visible layout regressions. It should not assert private variable names, exact generated class names, or framework implementation details.
- Run the existing lint command to catch invalid imports, malformed classes, and other static integration errors.
- Run the existing production-build command to prove that the installed framework version recognizes the Google Sans configuration and can resolve, optimize, and package the requested subsets.
- Inspect the home page as a representative application-shell and normal-interface route.
- Inspect the login page as a representative form route and confirm controls inherit the interface font.
- Inspect the JSON formatter as the mixed typography case: surrounding interface text uses Google Sans while the editor and formatted JSON remain monospaced.
- Inspect the Thai-name generator as the multilingual case: ordinary interface text and rendered Thai glyphs resolve to Google Sans while values intentionally marked as monospaced remain monospaced.
- Confirm in browser-computed styles that ordinary interface text resolves to Google Sans and that intentional monospace elements resolve to the existing monospace stack.
- Confirm in the browser's network or loaded-font view that production font assets are served from the application and do not require runtime requests to Google Fonts.
- Check representative desktop and narrow viewport layouts for clipping, overflow, unintended wrapping, or obvious typography-driven layout shifts.
- The repository's existing automated tests use Node's built-in test runner for domain and utility behavior. They provide no prior browser-rendering harness for global typography.
- Do not add a browser-testing dependency solely for this focused integration. Also avoid brittle source-text tests that merely prove an import or CSS variable exists without proving rendered behavior.
- Run the existing automated test suite as a regression check even though no existing test directly owns typography behavior.

## Out of Scope

- Replacing or redesigning the existing monospace font stack.
- Applying Google Sans to JSON, code-like content, generated identifiers, dates, or technical labels that are intentionally monospaced.
- Using Google Sans Flex, Google Sans Code, Product Sans, Roboto, or another substitute family.
- Changing typography sizes, line heights, letter spacing, declared component weights, or the application's type scale.
- Changing colors, spacing, borders, shadows, responsive behavior, navigation, page structure, or component layouts.
- Redesigning any page or introducing new UI components.
- Adding new application routes, tools, content, authentication behavior, APIs, database tables, or environment variables.
- Creating a general-purpose browser testing framework solely for this typography change.
- Changing the document language or translating existing interface copy.

## Further Notes

- Google Sans and Google Sans Flex have been available under the SIL Open Font License since November 2025, according to the official Google Fonts FAQ: https://fonts.google.com/faq?hl=en
- The installed framework version exposes Google Sans directly through its built-in Google Fonts API and lists Thai among the supported subsets.
- The current application has one global sans-serif declaration and one independent monospace declaration. Keeping those responsibilities separate provides a small, durable typography seam.
- No prototype was needed because the relevant decisions were resolved through repository inspection and the grilling session.
