// ONE CONTROL STYLE FOR THE WHOLE EDIT PANEL.
//
// The panel had grown four different treatments for the same kind of thing — a small,
// optional action on a section:
//
//   Edit / Draft with Aria (summary)   rounded-full, hairline slate-200 border
//   Add manually / Build with Aria     no border at all, a bare text button
//   Add skill                          square, DASHED slate-300 border
//   Suggest skills with Aria           square, solid slate-200 border
//
// Four shapes for one job, so nothing read as belonging to anything else, and the two
// borderless ones barely read as buttons.
//
// This is that one shape: the rounded pill the summary already used, with an INK border
// instead of a hairline. Ink because these controls are the panel's actual work — adding
// a role, asking Aria for skills — and a 200-weight border on white makes a control look
// disabled rather than quiet. Ink in dark mode is white; slate-900 on a slate-950 card
// would be a border you cannot see.
export const PREVIEW_PILL =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-900 px-2.5 py-1 ' +
  'text-[11.5px] font-medium text-slate-700 transition-colors ' +
  'hover:bg-slate-900 hover:text-white ' +
  'dark:border-slate-200 dark:text-slate-200 dark:hover:bg-slate-100 dark:hover:text-slate-900 ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

// Row-level controls (rename a group, delete an entry) USED to hide until the row was
// hovered, on hover-capable devices only:
//
//   opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100
//
// which meant every one of these was invisible on a desktop until you happened to move
// the pointer over the right row — including "Edit" and "Draft with Aria", the two things
// the panel exists for. It also made the panel behave differently on a laptop and a phone
// for no reason a user could see.
//
// They are visible now. They were already visible on touch, so this is not a new density
// so much as the end of a divergence — and they are quiet enough (small, slate-400) that
// showing them costs the document nothing.
export const ROW_CONTROL = 'opacity-100 transition-[opacity,color,border-color]';
