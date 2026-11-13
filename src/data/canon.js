/* ============================================================================
   TUMULT — CANON QUESTIONS (data)
   The web game asks for a little flavour as it goes and lets a player correct
   what it shows; every answer becomes a canon record (src/engine/canon.js)
   for the lore lead to approve or reject. These are the questions. They name
   no canon: they ask about it.

   Subjects are what a record is about: 'world', or a kind and an id —
   place:<atlas page>, pilot:<Cosmic Shore callsign>, hero:<pre-made id>,
   foe:<bestiary key>, patron:<id>, threat:<id>, event:<id>.
   ========================================================================== */
(function (T) {
  /** What a player can say about something the game shows them. */
  T.CANON_KINDS = {
    wrong: { label: 'That’s wrong', ask: 'What should it say?' },
    detail: { label: 'Add a detail', ask: 'What else is true of it?' },
    love: { label: 'Love this', ask: 'Anything to add? (optional)' },
    answer: { label: 'Answer', ask: '' },
  };

  /** The kinds of subject a record may be about. */
  T.CANON_SUBJECT_KINDS = ['world', 'place', 'pilot', 'hero', 'foe', 'patron', 'threat', 'event'];

  /**
   * Asked when a pilot is drafted, about the Cosmic Shore pilot whose painting they wear: why do they guide?
   * Three answers are offered (by the run, from this pool), or the player writes their own.
   */
  T.CANON_HOOKS = [
    'A debt they mean to pay off',
    'A promise made to someone downhill',
    'A place they need to get away from',
    'Someone they are trying to find',
    'Something to prove to their own people',
    'The ground moved and took their home with it',
    'A beacon that once saved them',
    'They are good at it, and nobody else would go',
  ];
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
