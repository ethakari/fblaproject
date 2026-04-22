import {
  query,
  orderBy,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "/firebase.js";
import { formatForDisplay } from "./modify-text.js";

let allItems = [];
let listedItems = [];
let activeItem = null;
const container = document.getElementById("items-container");
const searchInput = document.getElementById("search");
const itemCount = document.getElementById("item-count");
const selectedCategories = new Set(["all"]);
const categoryButtons = document.querySelectorAll(".category-btn");
const clearBtn = document.getElementById("clear-search");
const modal = document.getElementById("item-modal");
const claimForm = document.getElementById("claim-form");

clearBtn.addEventListener("click", () => {
  // clear search bar text
  searchInput.value = "";
  applyFilters();
});

categoryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const category = btn.dataset.category;

    // handle "All Categories"
    if (category === "all") {
      selectedCategories.clear();
      selectedCategories.add("all");

      categoryButtons.forEach((b) => deactivateButton(b));
      activateButton(btn);
    } else {
      // Remove "all" if selecting specific categories
      selectedCategories.delete("all");
      document
        .querySelector('[data-category="all"]')
        ?.classList.remove("bg-[#262626]", "text-white", "border-[#404040]");
      document
        .querySelector('[data-category="all"]')
        ?.classList.add("bg-[#1e1e1e]", "text-[#9EA3AE]", "border-transparent");

      if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
        deactivateButton(btn);
      } else {
        selectedCategories.add(category);
        activateButton(btn);
      }

      // default: if none selected, revert to all
      if (selectedCategories.size === 0) {
        selectedCategories.add("all");
        document
          .querySelector('[data-category="all"]')
          ?.classList.add("bg-[#262626]", "text-white", "border-[#404040]");
        document
          .querySelector('[data-category="all"]')
          ?.classList.remove(
            "bg-[#1e1e1e]",
            "text-[#9EA3AE]",
            "border-transparent",
          );
      }
    }

    applyFilters();
  });
});

// Toggle logic
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

// Example switch function
function toggleDarkMode() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.theme = 'light';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.theme = 'dark';
  }
}



function activateButton(btn) {
  // helper functions for activating filter buttons
  btn.classList.add("bg-[#262626]", "text-white", "border-[#404040]");
  btn.classList.remove("bg-[#1e1e1e]", "text-[#9EA3AE]", "border-transparent");
}

function deactivateButton(btn) {
  // helper functions for deactivating filter buttons
  btn.classList.remove("bg-[#262626]", "text-white", "border-[#404040]");
  btn.classList.add("bg-[#1e1e1e]", "text-[#9EA3AE]", "border-transparent");
}

async function loadItems() {
  const itemsRef = collection(db, "itemId");
  const q = query(itemsRef, orderBy("dateFound", "desc"));
  const snapshot = await getDocs(q);

  allItems = [];
  listedItems = [];

  snapshot.forEach((doc) => {
    const item = {
      id: doc.id,
      ...doc.data(),
    };
    allItems.push(item);

    if(item.status === "listed"){
      listedItems.push(item);
    }

  });

  renderItems(listedItems);
  itemCount.textContent = `${listedItems.length} items found • Help reunite lost belongings with their
  owners!`;
}

function renderItems(items) {
  // generate HTML for each card
  container.innerHTML = "";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className =
      "cursor-pointer item-tile flex flex-col bg-[#2c2c2c] rounded-xl border border-[#5B5B5B]";

    div.dataset.itemId = item.id;

    const imageSrc = item.imageUrl
      ? item.imageUrl
      : "/assets/image-unavailable.png";

    div.innerHTML = `
    <img
      src="${imageSrc}"
      alt="Item Image"
      class="w-full h-[250px] object-cover rounded-t-xl"
    />
    <div class="p-3 border-t border-[#5B5B5B]"> 
    <p class="text-lg font-[500] text-white">${formatForDisplay(item.name)}</p>
    <p class="text-sm text-[#D2D5DB]">Found: ${item.dateFound.toDate().toLocaleDateString("en-US")}</p>
    <p class="text-sm text-[#D2D5DB]">Location Found: ${formatForDisplay(item.location)}</p>
    </div>
  `;

    container.appendChild(div);
  });
}

searchInput.addEventListener("input", applyFilters);
function applyFilters() {
  const query = searchInput.value.toLowerCase();

  const filtered = listedItems.filter((item) => {
    // text filter
    const textMatch =
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);

    // tag filter
    const categoryMatch =
      selectedCategories.has("all") ||
      item.tags?.some((tag) => selectedCategories.has(tag));

    return textMatch && categoryMatch; // return intersection
  });

  // update item counter with length
  itemCount.textContent = `${filtered.length} items found • Help reunite lost belongings with their owners!!`;
  renderItems(filtered); // render
}
loadItems();

container.addEventListener("click", (e) => {
  const tile = e.target.closest(".item-tile");
  if (!tile) return;

  const itemId = tile.dataset.itemId;
  openModal(itemId);
});

function openModal(itemId) {
  const item = listedItems.find((i) => i.id === itemId);
  if (!item) return;

  activeItem = item;

  const tagsEl = document.getElementById("item-tags");

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    tagsEl.textContent = item.tags.join(", ");
  } else {
    tagsEl.textContent = "None";
  }

  // populate modal
  document.getElementById("item-title").textContent = formatForDisplay(
    item.name,
  );
  document.getElementById("item-image").src =
    item.imageUrl || "/assets/image-unavailable.png";
  document.getElementById("item-description").textContent =
    formatForDisplay(item.description) || "No description provided";
  document.getElementById("item-location").textContent = formatForDisplay(
    item.location,
  );
  document.getElementById("item-date").textContent = item.dateFound
    .toDate()
    .toLocaleDateString("en-US");
  document.body.classList.add("overflow-hidden");
  modal.classList.remove("hidden");
}

document.querySelectorAll(".close-modal").forEach((btn) => {
  btn.addEventListener("click", () => {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  });
});

claimForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!activeItem) {
    alert("No item selected.");
    return;
  }

  const claimer = document.getElementById("claim-name").value.trim();
  const email = document.getElementById("claim-email").value.trim();
  const phone = document.getElementById("claim-phone").value.trim();
  const proof = document.getElementById("claim-proof").value.trim();

  if (!claimer || !email || !proof) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    await addDoc(collection(db, "claimId"), {
      claimer,
      email,
      phone: phone || null,
      proof,
      status: "pending",
      submittedOn: serverTimestamp(),
      itemId: activeItem.id,
      itemName: activeItem.name,
    });

    claimForm.reset();
    modal.classList.add("hidden");
    alert("Claim submitted successfully!");
  } catch (err) {
    console.error(err);
    alert("Failed to submit claim.");
  }
});
