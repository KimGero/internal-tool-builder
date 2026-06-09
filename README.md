# Internal Tool Builder

> Open-source drag-drop editor for building internal business apps — a self-hostable alternative to Retool.

[![CI](https://github.com/KimGero/internal-tool-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/KimGero/internal-tool-builder/actions)
[![Tests](https://img.shields.io/badge/tests-250%2B%20passing-brightgreen)](./tests)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)


---

## What is it?

A WYSIWYG canvas where you drag widgets onto a page, connect them to a REST API or a JavaScript function, and wire everything together with `{{expression}}` bindings — without writing layout code.

Built because most teams eventually outgrow spreadsheets but find hosted tools like Retool either expensive or overengineered for a single internal dashboard.

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/internal-tool-builder
cd internal-tool-builder
npm install
npm run dev        # → http://localhost:5173
```

```bash
npm test           # watch mode
npm test -- --run  # single pass (CI)
npm run build      # production build → dist/
```

---

## Features

- **9 drag-drop widgets** — Table, Form, Chart, Button, Input, Container, DatePicker, Kanban, Calendar
- **2 data source types** — REST API (any URL + method + headers) and JavaScript (write any async code)
- **Expression language** — `{{variable}}` bindings work in every label, column renderer, and condition
- **Undo / redo** — 50-step history covering all component operations
- **Keyboard shortcuts** — Delete, Escape, Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+D
- **Save / load** — localStorage snapshots + JSON file export and import
- **Type-safe throughout** — single `src/types/index.ts` as the source of truth for all interfaces
- **250+ tests** — 15 test files covering core logic, every widget, and builder UI

---

## Component library

| Widget | What it does | Key props |
|--------|-------------|-----------|
| **Button** | Clickable button with loading state | `text`, `variant`, `disabled` |
| **Input** | Controlled text / number input bound to state | `label`, `type`, `binding` |
| **Table** | Sortable, searchable, paginated data grid | `columns`, `rowsPerPage`, `searchable` |
| **Form** | Multi-field form with submit handler | `fields`, `submitText` |
| **Chart** | Bar, line, and pie charts via Recharts | `type`, `xField`, `yField` |
| **DatePicker** | Calendar date picker | `format`, `binding`, `enableTime` |
| **Kanban** | Drag-drop board with column limits | `columns`, `statusField`, `titleField` |
| **Calendar** | Monthly event calendar | `titleField`, `dateField`, `colorField` |
| **Container** | Layout shell — column, row, or grid | `layout`, `cols`, `gap`, `bordered` |

---

## Data sources

Open the **Data** tab in the toolbar to configure sources. Every widget can be bound to one source — the query result is passed to the widget as the `data` prop.

**REST:**

```json
{
  "name": "Users",
  "type": "rest",
  "url": "https://jsonplaceholder.typicode.com/users",
  "method": "GET"
}
```

**JavaScript** (`fetch` and `console` are available):

```javascript
const res = await fetch(`/api/orders?status=${state.filter}`)
return res.json()
```

Use `{{state.key}}` inside URLs, headers, or JS code to make queries reactive:

```
https://api.example.com/users/{{state.selectedUserId}}
```

Results are cached per source with a configurable TTL (`cacheTTL` in milliseconds, default 30 000).

---

## Expression language

Every text prop evaluates `{{expression}}` blocks against the current app state.
The sandbox whitelists `Math`, `Date`, `JSON`, `String`, `Number`, `Array`, and `Object`.
`window`, `document`, and `eval` are blocked.

| Expression | Example result |
|-----------|----------------|
| `{{user.name}}` | `"Amara Osei"` |
| `{{items.length}} results` | `"42 results"` |
| `{{price * 1.16}}` | `116` |
| `{{status === 'active' ? 'Yes' : 'No'}}` | `"Yes"` |
| `{{rows.filter(r => r.active).length}}` | `7` |

Errors render as `[Error]` in place of the expression — never a crash.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Remove selected component |
| `Escape` | Deselect |
| `Ctrl / Cmd + Z` | Undo |
| `Ctrl / Cmd + Y` or `Ctrl / Cmd + Shift + Z` | Redo |
| `Ctrl / Cmd + S` | Save snapshot |
| `Ctrl / Cmd + D` | Duplicate selected component |

Shortcuts are suppressed when focus is inside an `<input>`, `<textarea>`, or `<select>`.

---

## Architecture

The project is split into four layers. Each layer only imports from layers below it — nothing ever imports upward.

```
Components       ButtonWidget · TableWidget · KanbanWidget · ... · Canvas · PropertiesPanel
      ↓ imports
Store / Services builderStore (Zustand + persist) · dataSourceManager · appStorage
      ↓ imports
Core             expressionEngine · eventBus · stateManager
      ↓ imports
Types            src/types/index.ts  ← single source of truth for all interfaces
```

**Types** (`src/types/index.ts`)\
`Context`, `App`, `AppComponent`, `DataSource`, `Runtime`, `ComponentDefinition`. No other file exports types — every interface lives here.

**Core** (`src/core/`)\
Framework-agnostic, no React dependency.
- `ExpressionEngine` — sandboxed `new Function()` evaluation; `tryEval` distinguishes _threw_ from _returned null_, so `evaluate()` can show `[Error]` vs empty string.
- `EventBus` — typed pub/sub; iterates a `[...listeners]` snapshot so listeners can remove themselves mid-emit; each listener is try/catch-wrapped so one bad listener never stops the rest.
- `StateManager` — runtime key/value state for apps being previewed (separate from Zustand, which holds the _builder's_ UI state).

**Store / Services** (`src/store/`, `src/services/`)\
- `builderStore` — Zustand store with 50-step undo/redo and localStorage persistence. `partialize` ensures only the `App` shape is persisted — history and UI state reset on reload.
- `dataSourceManager` — TTL-based cache; always returns an array so widgets never branch on response shape.
- `appStorage` — named localStorage snapshots + JSON file export/import with structural validation.

**Components** (`src/components/`, `src/builder/`)\
Each widget exports a React component and a `ComponentDefinition`. The registry (`src/components/registry.ts`) maps type strings → widgets. Both `ComponentPalette` and `Canvas` read from one map, so adding a new widget is one file + one registry line.

Two instances of state coexist by design:\
`builderStore` holds the _editor_ state (selected component, component list, dirty flag).\
`runtimeState` holds the _app_ state (form values, selected rows — anything a widget writes via `runtime.setState`).

---

## Project structure

```
src/
├── types/          # All shared TypeScript interfaces (never import types from elsewhere)
├── core/           # ExpressionEngine, EventBus, StateManager — no React dependency
├── store/          # Zustand builder store with undo/redo
├── services/       # DataSourceManager, AppStorage
├── components/     # Widget implementations + registry
├── builder/        # Canvas, ComponentPalette, PropertiesPanel, SaveLoadDialog
├── hooks/          # useKeyboardShortcuts
└── App.tsx         # Root: DndContext, mode switching, top bar, runtime wiring
tests/              # 17 test files, 250+ tests
```

---

## Testing

```bash
npm test                 
npm test -- --run                            
npm test -- --ui          
npm test -- --coverage   
```

| Suite | What is covered |
|-------|----------------|
| `expressionEngine` | Template evaluation, raw values, `$` in strings, error vs null |
| `eventBus` | Subscribe, once, emit, off, clear, exception isolation |
| `builderStore.undo` | Undo/redo round-trips, history cap, duplicateComponent |
| `useKeyboardShortcuts` | All shortcuts, editable-element suppression, cleanup |
| `componentPalette` | Tile click, drag data, unique UUID per instance |
| `propertiesPanel` | String / bool / number fields, delete, events section, data source picker |
| `tableWidget` | Sort, paginate, search, row selection |
| `formWidget` | Fields, validation, submit |
| `chartWidget` | Bar / line / pie rendering |
| `datePickerWidget` | Open/close, date selection, time picker |
| `kanbanWidget` | Column render, drag between columns, limits |
| `calendarWidget` | Grid math, leap year, event grouping |
| `appStorage` | Save/load, export filename, import validation, eviction cleanup |
| `saveLoadDialog` | Save, open, delete, import errors, export |
| `app` | Mode switching, app name, dirty state, new app confirm |

---

## Roadmap

- [ ] PostgreSQL / MySQL via Supabase Edge Functions
- [ ] Multi-page apps with navigation
- [ ] Role-based access control
- [ ] Published apps on a public subdomain
- [ ] More widgets: RichText, Image, PDF viewer, Map

---

## Contributing

1. Fork → clone → `npm install && npm run dev`
2. Branch: `git checkout -b feat/your-feature`
3. Write tests for any new behaviour (follow patterns in `tests/`)
4. `npm test -- --run && npm run build` — both must pass before opening a PR
5. Keep components under ~150 lines; extract pure functions so they can be tested without React

New widgets belong in `src/components/`. Export the component and a `ComponentDefinition`, then add one line to `src/components/registry.ts`. That is the entire surface area.

---

## License

[MIT](./LICENSE) — use it, fork it, ship it.

Built in Nairobi, Kenya 🇰🇪