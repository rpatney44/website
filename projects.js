const container = document.querySelector(".container");

// filter cards by date
function sortCardsByDate() {
  const cards = Array.from(container.querySelectorAll(".card"));
  cards.sort((a, b) => new Date(b.dataset.date) - new Date(a.dataset.date));
  cards.forEach(card => container.appendChild(card));
}

window.addEventListener("DOMContentLoaded", sortCardsByDate);

// Wait until the page content is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Grab all filter buttons
  const filterButtons = document.querySelectorAll(".filter-btn");

  // Grab all article cards
  const cards = container.querySelectorAll(".card");

  // How long a card takes to fade in or out — keep FADE_MS in sync with the
  // .card transition in projects.css — and how far apart their starts are
  // spaced. SLIDE_MS is how long a card takes to travel to its new cell.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const FADE_MS = 300;
  const SLIDE_MS = 320;
  const STAGGER_MS = 30;
  const MAX_STAGGER_MS = 300; // long decks shouldn't trickle in forever

  // Helper function: does this card belong to the selected category?
  // Nothing matches until the reader picks one.
  function matchesCategory(card, category) {
    if (!category) return false;
    if (category === "all") return true;

    return card.dataset.category
      .split(",")
      .map((c) => c.trim())
      .includes(category);
  }

  // A card counts as on screen unless it's hidden or already fading out
  function isVisible(card) {
    return card.style.display !== "none" && !card.classList.contains("leaving");
  }

  // Helper function: wipe whatever the last animation left on a card, so an
  // interrupted one never leaks a stale transform or transition into the next
  function clearAnimation(card) {
    clearTimeout(card.slideTimer);
    card.style.transition = "";
    card.style.transform = "";
    card.style.transitionDelay = "";
  }

  // Helper function: unpin a card that was floating above the grid
  function unfloat(card) {
    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
  }

  // Helper function: lift a card out of the grid, pinned to the spot it
  // already occupies, so the cards that remain can close the gap around it
  // while it fades out on top.
  function floatOut(card, rect, containerRect) {
    clearTimeout(card.fadeTimer);
    clearAnimation(card);

    card.style.position = "absolute";
    card.style.left = `${rect.left - containerRect.left}px`;
    card.style.top = `${rect.top - containerRect.top}px`;
    card.style.width = `${rect.width}px`;
    card.style.height = `${rect.height}px`;

    card.classList.remove("entering");
    card.classList.add("leaving");

    card.fadeTimer = setTimeout(() => {
      card.classList.remove("leaving");
      unfloat(card);
      card.style.display = "none";
    }, FADE_MS);
  }

  // Helper function: fade a card in. `order` is its place among the cards
  // being shown, so they arrive one shortly after the other.
  function fadeIn(card, order) {
    const delay = Math.min(order * STAGGER_MS, MAX_STAGGER_MS);

    // The browser has to paint the faded-out start state before it can
    // transition away from it, hence waiting a frame (two, to be safe) first
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.style.transitionDelay = `${delay}ms`;
      card.classList.remove("entering");

      // Drop the delay again once it's in, so hovering stays instant
      card.fadeTimer = setTimeout(() => {
        card.style.transitionDelay = "";
      }, delay + FADE_MS);
    }));
  }

  // Helper function: slide the cards that stayed from where they were to
  // where the reflowed grid just put them (the FLIP trick — measure First
  // and Last, INVERT the difference away with a transform, then PLAY it
  // back out). `before` maps each card to the rect it had beforehand.
  function slideIntoPlace(staying, before) {
    // Read every new position in one pass and write in the next — doing both
    // per card would make the browser re-lay-out the grid each time round
    const moved = [];

    staying.forEach((card) => {
      const from = before.get(card);
      const to = card.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (dx || dy) moved.push({ card, dx, dy });
    });

    if (moved.length === 0) return;

    // INVERT: park each card back where it came from, without a transition
    moved.forEach(({ card, dx, dy }) => {
      card.style.transition = "none";
      card.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    void container.offsetHeight; // hand that start state to the browser

    // PLAY: drop the offset and let the transition carry them home
    moved.forEach(({ card }) => {
      card.style.transition = `transform ${SLIDE_MS}ms ease`;
      card.style.transform = "";
      card.slideTimer = setTimeout(() => {
        card.style.transition = "";
      }, SLIDE_MS);
    });
  }

  // Helper function: ease the grid between two heights, so the footer below
  // it drifts up or down instead of jumping when the row count changes
  function slideHeight(from, to) {
    if (Math.round(from) === Math.round(to)) {
      container.style.transition = "";
      return;
    }

    container.style.transition = "none";
    container.style.height = `${from}px`;
    void container.offsetHeight;

    container.style.transition = `height ${SLIDE_MS}ms ease`;
    container.style.height = `${to}px`;

    // Back to an auto height once it's there, so the grid keeps reflowing
    // with the window afterwards
    container.heightTimer = setTimeout(() => {
      container.style.transition = "";
      container.style.height = "";
    }, SLIDE_MS);
  }

  // Helper function: show/hide cards based on selected category.
  // The first pass on page load skips the animation — there's nothing on
  // screen yet to animate away.
  function filterCards(category, animate = true) {
    if (!animate || reducedMotion.matches) {
      clearTimeout(container.heightTimer);
      container.style.transition = "";
      container.style.height = "";

      cards.forEach((card) => {
        clearTimeout(card.fadeTimer);
        clearAnimation(card);
        unfloat(card);
        card.classList.remove("entering", "leaving");
        card.style.display = matchesCategory(card, category) ? "" : "none";
      });
      return;
    }

    // Sort the deck into the three things that can happen to a card
    const entering = [];
    const leaving = [];
    const staying = [];

    cards.forEach((card) => {
      if (matchesCategory(card, category)) {
        (isVisible(card) ? staying : entering).push(card);
      } else if (isVisible(card)) {
        leaving.push(card);
      }
    });

    // FIRST: where everything sits right now. Measured before anything moves,
    // and before the transforms below are cleared, so a card caught mid-slide
    // carries on from where it appears rather than jumping.
    const containerRect = container.getBoundingClientRect();
    const before = new Map(staying.map((c) => [c, c.getBoundingClientRect()]));
    const leavingRects = new Map(leaving.map((c) => [c, c.getBoundingClientRect()]));

    // Cards on the way out stop taking up a cell straight away
    leaving.forEach((card) => floatOut(card, leavingRects.get(card), containerRect));

    // Cards coming in claim their cell now, but start out invisible
    entering.forEach((card) => {
      clearTimeout(card.fadeTimer);
      clearAnimation(card);
      unfloat(card);
      card.classList.remove("leaving");
      card.classList.add("entering"); // faded out and nudged down
      card.style.display = "";        // back to whatever the stylesheet says
    });

    // Cards that stay keep their cell, but shed any leftover transform so
    // the measurement below reads their real position
    staying.forEach(clearAnimation);

    // Let the grid find its natural height again before it gets measured
    clearTimeout(container.heightTimer);
    container.style.transition = "none";
    container.style.height = "";

    // The grid has reflowed by now, so LAST, INVERT and PLAY the slide
    const endHeight = container.getBoundingClientRect().height;
    slideIntoPlace(staying, before);
    slideHeight(containerRect.height, endHeight);

    // ...and start the new arrivals fading in
    entering.forEach(fadeIn);
  }

  // Helper function: widen a few featured cards to two columns so they add
  // up to whole rows — no single card stranded on the last row.
  // Only the featured grid does this; the filtered deck below stays uniform.
  function fillRows(grid) {
    const gridCards = Array.from(grid.querySelectorAll(".card"));

    // Start from scratch, so we measure against the current column count
    gridCards.forEach((card) => card.classList.remove("wide"));

    // The computed value lists one track per column, e.g. "272px 272px 272px"
    const tracks = getComputedStyle(grid).gridTemplateColumns;
    if (!tracks || tracks === "none") return;
    const columns = tracks.split(" ").length;

    // One column: everything is a full row already, and a span would overflow
    if (columns < 2 || gridCards.length === 0) return;

    const leftover = gridCards.length % columns;
    if (leftover === 0) return;

    // Each widened card takes one extra cell; this many fills the last row
    const extra = columns - leftover;

    // Spread them through the deck, but keep them out of the final row so
    // dense packing always has a narrow card left over to backfill the gap
    const range = Math.max(gridCards.length - columns, extra);
    for (let i = 0; i < extra; i++) {
      const index = Math.min(
        Math.floor(((i + 0.5) * range) / extra),
        gridCards.length - 1
      );
      gridCards[index].classList.add("wide");
    }
  }

  const featuredGrids = document.querySelectorAll(".featured-grid");

  function fillFeatured() {
    featuredGrids.forEach(fillRows);
  }

  // The column count changes with the window, so recompute as it resizes
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fillFeatured, 150);
  });

  // Helper function: update active button styles
  function updateActiveButton(category) {
    filterButtons.forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.dataset.category === category
      );
    });
  }

  // Helper function: update URL without reloading the page
  function updateURL(category) {
    const url = new URL(window.location);
    if (!category || category === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", category);
    }
    window.history.pushState({}, "", url);
  }

  // Handle button clicks
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Clicking the button that's already on turns the filter off again
      const category = button.classList.contains("active")
        ? undefined
        : button.dataset.category;

      filterCards(category);        // Filter visible cards
      updateActiveButton(category); // Highlight active button
      updateURL(category);          // Save filter in URL
    });
  });

  // On page load: check if URL already has a category
  const params = new URLSearchParams(window.location.search);
  // undefined when the URL doesn't name one
  const initialCategory = params.get("category") ?? undefined;

  // Nothing is shown until the reader picks a category
  // (or the URL already named one)
  filterCards(initialCategory, false);
  updateActiveButton(initialCategory);

  // Featured cards are never filtered, so this only needs the initial pass
  fillFeatured();
});