// Ready-made questions per step — most students don't know what to ask, so hand them good ones.
export const suggestionsFor = (stepId) =>
  ({
    target_job: ['Why does the target job matter?', "What if I don't have one?"],
    heading: ['What goes in my heading?', 'Do I need LinkedIn?'],
    history: ['What goes here?', 'Give me an example', "I'm stuck"],
    projects: ['Should I add projects?', 'What makes a good project bullet?'],
    education: ["What if I didn't finish?", 'How much detail?'],
    skills: ['Which skills matter here?', 'How many should I list?'],
    summary: ['What makes a good summary?', 'What should mine say?'],
    finalize: ['Is my CV ready?', "What's still missing?"],
  })[stepId] || ['What goes here?', 'Give me an example', "I'm stuck"];
