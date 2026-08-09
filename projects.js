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
  const cards = document.querySelectorAll(".card");

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
      if (category === "all" || cardCategories.includes(category)) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  }

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
    if (category === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", category);
    }
    window.history.pushState({}, "", url);
  }

  // Handle button clicks
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;

      filterCards(category);        // Filter visible cards
      updateActiveButton(category); // Highlight active button
      updateURL(category);          // Save filter in URL
    });
  });

  // On page load: check if URL already has a category
  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get("category") || "all";

  // Apply the filter from the URL
  filterCards(initialCategory);
  updateActiveButton(initialCategory);
});