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

  // Helper function: show/hide cards based on selected category
  function filterCards(category) {
    cards.forEach((card) => {
      // Get the card's categories and split them into an array
      const cardCategories = card.dataset.category
        .split(",")
        .map((c) => c.trim());

      // Show card if:
      // - "all" is selected OR
      // - the card includes the selected category
      // (no category selected yet: hide everything)
      if (category && (category === "all" || cardCategories.includes(category))) {
        card.style.display = "";   // back to whatever the stylesheet says
      } else {
        card.style.display = "none";
      }
    });
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
  filterCards(initialCategory);
  updateActiveButton(initialCategory);

  // Featured cards are never filtered, so this only needs the initial pass
  fillFeatured();
});