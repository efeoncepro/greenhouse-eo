/**
 * TASK-2051 — Section map of the approved boards: the order of the top-level <section> elements of each board and the
 * `data-capture` name each one carries in production. Shared by the reference capture, the production capture and
 * the pixel comparator, so a section can never be compared against its neighbour.
 */
const BOARDS = {
  'Portada-v3': { viewport: { width: 1440, height: 900 }, sections: ['blog-hero', 'blog-ask', 'blog-glitch', 'blog-events', 'blog-rail', 'blog-topics', 'blog-archive', 'blog-subscribe'] },
  'Movil-v3': { viewport: { width: 390, height: 844 }, sections: ['blog-masthead', 'blog-hero', 'blog-ask', 'blog-glitch', 'blog-events', 'blog-rail', 'blog-topics', 'blog-archive', 'blog-subscribe'] },
}

module.exports = { BOARDS }
