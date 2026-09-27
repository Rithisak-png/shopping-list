// ==========================================
// SUPABASE DATABASE CONNECTION
// ==========================================

const SUPABASE_URL =
    "https://qxbxupwcqycepcvgoxae.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_ObRhdGjAvHqTxEKjXxn5hg_3FmQeteQ";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

// Supabase Storage bucket name — create this in your Supabase dashboard
const BUCKET_NAME = "product-images";


// ==========================================
// MULTIPLE LISTS — state
// ==========================================

// Lists are stored in localStorage as an array of { id, name }
// "Default" list always exists with id = "default"

const DEFAULT_LIST = { id: "default", name: "Weekly Shopping" };

function getLists() {
    try {
        const raw = localStorage.getItem("buying_lists");
        if (!raw) return [DEFAULT_LIST];
        const parsed = JSON.parse(raw);
        // Ensure default always present
        if (!parsed.find(l => l.id === "default")) {
            parsed.unshift(DEFAULT_LIST);
        }
        return parsed;
    } catch {
        return [DEFAULT_LIST];
    }
}

function saveLists(lists) {
    localStorage.setItem("buying_lists", JSON.stringify(lists));
}

function getActiveList() {
    return localStorage.getItem("buying_active_list") || "default";
}

function setActiveList(id) {
    localStorage.setItem("buying_active_list", id);
}

function generateListId() {
    return "list_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}


// ==========================================
// LOGIN
// ==========================================

const CORRECT_PIN = "66668888";

function doLogin() {

    const pin =
        document.getElementById("pinInput").value;

    const err =
        document.getElementById("loginError");

    if (pin === CORRECT_PIN) {

        err.style.display = "none";

        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appScreen").style.display   = "block";

        renderListTabs();
        loadProducts();

    } else {

        err.style.display = "block";

        document.getElementById("pinInput").value = "";
        document.getElementById("pinInput").focus();
    }
}

function doLogout() {

    document.getElementById("appScreen").style.display   = "none";
    document.getElementById("loginScreen").style.display = "flex";

    document.getElementById("pinInput").value          = "";
    document.getElementById("loginError").style.display = "none";

    // Clear selection state
    selectedIds.clear();
}

function togglePin() {

    const input = document.getElementById("pinInput");
    input.type  = input.type === "password" ? "text" : "password";
}


// ==========================================
// TOAST NOTIFICATION
// ==========================================

function showToast(message, type = "success") {

    const old = document.querySelector(".toast");
    if (old) old.remove();

    const t       = document.createElement("div");
    t.className   = `toast toast-${type}`;
    t.textContent = message;
    document.body.appendChild(t);

    setTimeout(() => t.remove(), 3500);
}


// ==========================================
// IMAGE PREVIEW (Add form)
// ==========================================

function previewImage(input) {

    const wrap = document.getElementById("imagePreviewWrap");
    const img  = document.getElementById("imagePreview");

    if (input.files && input.files[0]) {

        const reader = new FileReader();

        reader.onload = function(e) {
            img.src             = e.target.result;
            wrap.style.display  = "flex";
        };

        reader.readAsDataURL(input.files[0]);

    } else {
        wrap.style.display = "none";
        img.src            = "";
    }
}

function clearImage() {

    document.getElementById("imageFile").value  = "";
    document.getElementById("imagePreview").src = "";
    document.getElementById("imagePreviewWrap").style.display = "none";
}


// ==========================================
// IMAGE PREVIEW (Edit modal)
// ==========================================

function previewEditImage(input) {

    const wrap = document.getElementById("editImagePreviewWrap");
    const img  = document.getElementById("editImagePreview");

    if (input.files && input.files[0]) {

        const reader = new FileReader();

        reader.onload = function(e) {
            img.src            = e.target.result;
            wrap.style.display = "flex";
        };

        reader.readAsDataURL(input.files[0]);

    } else {
        wrap.style.display = "none";
        img.src            = "";
    }
}

function clearEditImage() {

    document.getElementById("editImageFile").value  = "";
    document.getElementById("editImagePreview").src = "";
    document.getElementById("editImagePreviewWrap").style.display = "none";
}


// ==========================================
// UPLOAD IMAGE TO SUPABASE STORAGE
// ==========================================

async function uploadImage(file) {

    const ext      = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } =
        await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false
            });

    if (error) {
        console.error("IMAGE UPLOAD ERROR:", error);
        throw error;
    }

    const { data: urlData } =
        supabaseClient
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

    return urlData.publicUrl;
}


// ==========================================
// DELETE IMAGE FROM SUPABASE STORAGE
// ==========================================

async function deleteImage(imageUrl) {

    if (!imageUrl) return;

    const parts    = imageUrl.split(`/${BUCKET_NAME}/`);
    const filePath = parts[1];

    if (!filePath) return;

    const { error } =
        await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .remove([filePath]);

    if (error) {
        console.error("IMAGE DELETE ERROR:", error);
    }
}


// ==========================================
// ADD PRODUCT
// ==========================================

async function addProduct() {

    const productName =
        document.getElementById("productName").value.trim();

    const buyer =
        document.getElementById("buyer").value.trim();

    const quantity =
        Number(document.getElementById("quantity").value);

    const price =
        Number(document.getElementById("price").value);

    const link =
        document.getElementById("link").value.trim();

    const note =
        document.getElementById("note").value.trim();

    const imageFileInput =
        document.getElementById("imageFile");

    const imageFile =
        imageFileInput.files[0] || null;

    const listId = getActiveList();


    // --------------------------------------
    // VALIDATE
    // --------------------------------------

    if (productName === "") {
        showToast("Please enter product name.", "error");
        return;
    }

    if (buyer === "") {
        showToast("Please enter buyer name.", "error");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showToast("Quantity must be greater than 0.", "error");
        return;
    }

    if (isNaN(price) || price < 0) {
        showToast("Please enter a valid price.", "error");
        return;
    }

    if (imageFile) {
        const allowed = ["image/png", "image/jpeg"];
        if (!allowed.includes(imageFile.type)) {
            showToast("Only PNG or JPG images are allowed.", "error");
            return;
        }
    }


    // --------------------------------------
    // DISABLE BUTTON WHILE SAVING
    // --------------------------------------

    const btn = document.getElementById("btnAdd");
    btn.disabled    = true;
    btn.textContent = "Saving...";


    // --------------------------------------
    // UPLOAD IMAGE (if any)
    // --------------------------------------

    let imageUrl = null;

    if (imageFile) {
        try {
            imageUrl = await uploadImage(imageFile);
        } catch (err) {
            showToast("Image upload failed: " + err.message, "error");
            btn.disabled  = false;
            btn.innerHTML = "<span>+</span> Add Product";
            return;
        }
    }


    // --------------------------------------
    // SAVE TO DATABASE
    // --------------------------------------

    const { data, error } =
        await supabaseClient
            .from("products")
            .insert([{
                product_name: productName,
                buyer:        buyer,
                quantity:     quantity,
                price_each:   price,
                product_link: link,
                note:         note,
                image_url:    imageUrl,
                status:       "Not Bought",
                list_id:      listId
            }])
            .select();

    if (error) {
        console.error("ADD PRODUCT ERROR:", error);
        showToast("Error adding product: " + error.message, "error");
        btn.disabled  = false;
        btn.innerHTML = "<span>+</span> Add Product";
        return;
    }

    console.log("Product added:", data);
    showToast("✅ Product added successfully!");


    // --------------------------------------
    // CLEAR FORM
    // --------------------------------------

    document.getElementById("productName").value = "";
    document.getElementById("buyer").value       = "";
    document.getElementById("quantity").value    = 1;
    document.getElementById("price").value       = "";
    document.getElementById("link").value        = "";
    document.getElementById("note").value        = "";

    clearImage();

    btn.disabled  = false;
    btn.innerHTML = "<span>+</span> Add Product";

    loadProducts();
}


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {

    const sortSelect = document.getElementById("sortSelect");
    const sortValue  = sortSelect ? sortSelect.value : "newest";
    const searchVal  = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
    const listId     = getActiveList();

    // Show/hide search clear button
    const clearBtn = document.getElementById("searchClear");
    if (clearBtn) clearBtn.style.display = searchVal ? "block" : "none";

    // Update table title
    const lists  = getLists();
    const active = lists.find(l => l.id === listId);
    const titleEl = document.getElementById("tableTitle");
    if (titleEl && active) titleEl.textContent = active.name + " — Products";


    // --------------------------------------
    // BUILD QUERY
    // --------------------------------------

    let query = supabaseClient
        .from("products")
        .select("*")
        .eq("list_id", listId);

    if (sortValue === "az") {
        query = query.order("product_name", { ascending: true  });
    } else if (sortValue === "za") {
        query = query.order("product_name", { ascending: false });
    } else {
        query = query.order("created_at",   { ascending: false });
    }

    const { data: allData, error } = await query;

    if (error) {
        console.error("LOAD PRODUCTS ERROR:", error);
        showToast("Error loading products: " + error.message, "error");
        return;
    }

    // Client-side search filter
    const data = searchVal
        ? allData.filter(p =>
            p.product_name.toLowerCase().includes(searchVal) ||
            (p.buyer || "").toLowerCase().includes(searchVal)
          )
        : allData;

    // Reset selection when reloading
    selectedIds.clear();
    updateBulkBar();

    // Update stats
    updateStats(allData);


    // --------------------------------------
    // RENDER — Desktop Table
    // --------------------------------------

    const table = document.getElementById("productTable");
    table.innerHTML = "";

    // Uncheck head checkbox
    const headChk = document.getElementById("selectAllHead");
    if (headChk) headChk.checked = false;


    // --------------------------------------
    // RENDER — Mobile Cards
    // --------------------------------------

    const mobileCards = document.getElementById("mobileCards");
    mobileCards.innerHTML = "";


    if (data.length === 0) {
        const emptyMsg = searchVal
            ? `No products match "<strong>${escapeHtml(searchVal)}</strong>"`
            : "No products yet. Add one above!";

        table.innerHTML = `
            <tr>
                <td colspan="11">
                    <div class="empty-state">
                        <div style="font-size:40px">📋</div>
                        <p>${emptyMsg}</p>
                    </div>
                </td>
            </tr>
        `;
        mobileCards.innerHTML = `
            <div class="empty-state">
                <div style="font-size:40px">📋</div>
                <p>${emptyMsg}</p>
            </div>
        `;
        document.getElementById("grandTotal").textContent = "0.00";
        return;
    }

    let grandTotal = 0;

    data.forEach(product => {

        const quantity  = Number(product.quantity);
        const price     = Number(product.price_each);
        const total     = quantity * price;
        grandTotal     += total;

        const statusClass = product.status === "Bought"
            ? "status-bought"
            : "status-not-bought";

        // Highlighted text helper
        const hl = (str) => highlightText(str || "", searchVal);


        // ----------------------------------
        // IMAGE CELL
        // ----------------------------------

        const imgHtml = product.image_url
            ? `<img src="${product.image_url}" alt="${escapeHtml(product.product_name)}" class="product-img" onclick="openLightbox('${product.image_url}')">`
            : `<div class="no-img">📦</div>`;


        // ----------------------------------
        // LINK CELL
        // ----------------------------------

        const linkHtml = product.product_link
            ? `<a href="${product.product_link}" target="_blank" rel="noopener noreferrer" class="link-btn">🔗 Open</a>`
            : `<span style="color:var(--text-muted);font-size:12px">—</span>`;


        // ----------------------------------
        // NOTE CELL
        // ----------------------------------

        const noteHtml = product.note
            ? `<span class="note-cell" title="${escapeHtml(product.note)}">${hl(product.note)}</span>`
            : `<span style="color:var(--text-muted);font-size:12px">—</span>`;


        // ----------------------------------
        // STATUS SELECT
        // ----------------------------------

        const statusSelectHtml = `
            <select class="status-select ${statusClass}" onchange="changeStatus(${product.id}, this.value, this)">
                <option value="Not Bought" ${product.status === "Not Bought" ? "selected" : ""}>Not Bought</option>
                <option value="Bought"     ${product.status === "Bought"     ? "selected" : ""}>Bought</option>
            </select>
        `;


        // ----------------------------------
        // DESKTOP TABLE ROW
        // ----------------------------------

        const row = document.createElement("tr");
        row.dataset.id = product.id;

        row.innerHTML = `
            <td><input type="checkbox" class="row-chk" data-id="${product.id}" onchange="onRowCheck(this)"></td>
            <td>${imgHtml}</td>
            <td class="product-name">${hl(product.product_name)}</td>
            <td>${hl(product.buyer)}</td>
            <td>${quantity}</td>
            <td><strong>¥${price.toFixed(2)}</strong></td>
            <td><strong>¥${total.toFixed(2)}</strong></td>
            <td>${linkHtml}</td>
            <td>${noteHtml}</td>
            <td>${statusSelectHtml}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editProduct(${product.id})">✏️ Edit</button>
                    <button class="btn-del"  onclick="openDeleteModal(${product.id}, '${escapeHtml(product.product_name)}', '${product.image_url || ""}')">🗑️ Del</button>
                </div>
            </td>
        `;

        table.appendChild(row);


        // ----------------------------------
        // MOBILE CARD
        // ----------------------------------

        const mCard = document.createElement("div");
        mCard.className = "m-card";
        mCard.dataset.id = product.id;

        mCard.innerHTML = `
            <div class="m-card-top">
                <div class="m-card-check">
                    <input type="checkbox" class="row-chk" data-id="${product.id}" onchange="onRowCheck(this)">
                </div>
                <div class="m-card-img">
                    ${product.image_url
                        ? `<img src="${product.image_url}" alt="${escapeHtml(product.product_name)}" onclick="openLightbox('${product.image_url}')">`
                        : `<div class="no-img">📦</div>`}
                </div>
                <div class="m-card-body">
                    <div class="m-card-name">${hl(product.product_name)}</div>
                    <div class="m-card-meta">
                        <span>👤 ${hl(product.buyer)}</span>
                        <span>📦 Qty: ${quantity}</span>
                    </div>
                    <div class="m-card-prices">
                        <div>
                            <div class="m-price-label">Each</div>
                            <div class="m-price-val">¥${price.toFixed(2)}</div>
                        </div>
                        <div>
                            <div class="m-price-label">Total</div>
                            <div class="m-price-val">¥${total.toFixed(2)}</div>
                        </div>
                    </div>
                    ${product.note ? `<div class="m-card-note">📝 ${hl(product.note)}</div>` : ""}
                </div>
            </div>
            <div class="m-card-bottom">
                ${statusSelectHtml}
                ${product.product_link ? `<a href="${product.product_link}" target="_blank" rel="noopener noreferrer" class="link-btn">🔗 Open</a>` : ""}
                <div class="m-card-actions">
                    <button class="btn-edit" onclick="editProduct(${product.id})">✏️</button>
                    <button class="btn-del"  onclick="openDeleteModal(${product.id}, '${escapeHtml(product.product_name)}', '${product.image_url || ""}')">🗑️</button>
                </div>
            </div>
        `;

        mobileCards.appendChild(mCard);
    });

    document.getElementById("grandTotal").textContent = grandTotal.toFixed(2);
}


// ==========================================
// SEARCH
// ==========================================

function clearSearch() {
    document.getElementById("searchInput").value = "";
    document.getElementById("searchClear").style.display = "none";
    loadProducts();
}

// Highlight search term in text
function highlightText(text, term) {
    if (!term) return escapeHtml(text);
    const escaped   = escapeHtml(text);
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escaped.replace(
        new RegExp(escapedTerm, "gi"),
        match => `<mark class="highlight">${match}</mark>`
    );
}


// ==========================================
// SUMMARY STATS
// ==========================================

function updateStats(data) {
    const total   = data.length;
    const bought  = data.filter(p => p.status === "Bought").length;
    const pending = total - bought;
    const spent   = data.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.price_each)), 0);

    document.getElementById("statTotal").textContent   = total;
    document.getElementById("statBought").textContent  = bought;
    document.getElementById("statPending").textContent = pending;
    document.getElementById("statSpent").textContent   = "¥" + spent.toFixed(2);
}


// ==========================================
// BULK DELETE
// ==========================================

let selectedIds = new Set();

function onRowCheck(checkbox) {
    const id = checkbox.dataset.id;
    if (checkbox.checked) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
    }
    // Sync all checkboxes with same data-id (desktop + mobile)
    document.querySelectorAll(`.row-chk[data-id="${id}"]`).forEach(chk => {
        chk.checked = checkbox.checked;
    });
    // Highlight rows
    document.querySelectorAll(`tr[data-id="${id}"], .m-card[data-id="${id}"]`).forEach(el => {
        el.classList.toggle("row-selected", checkbox.checked);
    });
    updateBulkBar();
}

function toggleSelectAll(masterChk) {
    const checked = masterChk.checked;
    document.querySelectorAll(".row-chk").forEach(chk => {
        chk.checked = checked;
        const id = chk.dataset.id;
        if (checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
    });
    document.querySelectorAll("tr[data-id], .m-card[data-id]").forEach(el => {
        el.classList.toggle("row-selected", checked);
    });
    // Sync both master checkboxes
    document.querySelectorAll("#selectAll, #selectAllHead").forEach(c => c.checked = checked);
    updateBulkBar();
}

function updateBulkBar() {
    const bar   = document.getElementById("bulkBar");
    const count = selectedIds.size;

    if (count > 0) {
        bar.style.display = "flex";
        document.getElementById("selectedCount").textContent = `${count} selected`;
        document.getElementById("selectAll").checked = false; // managed manually
    } else {
        bar.style.display = "none";
    }
}

function bulkDelete() {
    if (selectedIds.size === 0) return;
    document.getElementById("bulkDeleteCount").textContent = selectedIds.size;
    document.getElementById("bulkDeleteModal").classList.add("open");
}

function closeBulkDeleteModal() {
    document.getElementById("bulkDeleteModal").classList.remove("open");
}

async function confirmBulkDelete() {

    const ids = Array.from(selectedIds);

    // Fetch image URLs first so we can delete from storage
    const { data: products, error: fetchErr } =
        await supabaseClient
            .from("products")
            .select("id, image_url")
            .in("id", ids.map(Number));

    if (fetchErr) {
        showToast("Error fetching products: " + fetchErr.message, "error");
        return;
    }

    // Delete from DB
    const { error: delErr } =
        await supabaseClient
            .from("products")
            .delete()
            .in("id", ids.map(Number));

    if (delErr) {
        showToast("Error deleting products: " + delErr.message, "error");
        return;
    }

    // Delete images from storage
    for (const p of products) {
        if (p.image_url) await deleteImage(p.image_url);
    }

    closeBulkDeleteModal();
    selectedIds.clear();
    updateBulkBar();
    showToast(`🗑️ ${ids.length} product(s) deleted.`);
    loadProducts();
}


// ==========================================
// MULTIPLE LISTS — UI
// ==========================================

function renderListTabs() {
    const lists    = getLists();
    const activeId = getActiveList();
    const container = document.getElementById("listTabs");
    container.innerHTML = "";

    lists.forEach(list => {
        const tab = document.createElement("button");
        tab.className = "list-tab" + (list.id === activeId ? " active" : "");
        tab.innerHTML = `
            <span>${escapeHtml(list.name)}</span>
            <button class="tab-manage" title="Manage list" onclick="event.stopPropagation(); openManageListModal('${list.id}')">⚙</button>
        `;
        tab.addEventListener("click", () => {
            setActiveList(list.id);
            renderListTabs();
            loadProducts();
        });
        container.appendChild(tab);
    });
}

function openNewListModal() {
    document.getElementById("newListName").value = "";
    document.getElementById("newListModal").classList.add("open");
    setTimeout(() => document.getElementById("newListName").focus(), 80);
}

function closeNewListModal() {
    document.getElementById("newListModal").classList.remove("open");
}

function createList() {
    const name = document.getElementById("newListName").value.trim();
    if (!name) { showToast("Please enter a list name.", "error"); return; }

    const lists = getLists();
    const newList = { id: generateListId(), name };
    lists.push(newList);
    saveLists(lists);
    setActiveList(newList.id);
    closeNewListModal();
    renderListTabs();
    loadProducts();
    showToast("✅ List \"" + name + "\" created!");
}

// -- Manage (rename / delete) --

let _managingListId = null;

function openManageListModal(listId) {
    const lists = getLists();
    const list  = lists.find(l => l.id === listId);
    if (!list) return;
    _managingListId = listId;
    document.getElementById("manageListName").value = list.name;
    document.getElementById("manageListModal").classList.add("open");
    setTimeout(() => document.getElementById("manageListName").focus(), 80);
}

function closeManageListModal() {
    document.getElementById("manageListModal").classList.remove("open");
    _managingListId = null;
}

function renameCurrentList() {
    const name = document.getElementById("manageListName").value.trim();
    if (!name) { showToast("Please enter a name.", "error"); return; }
    const lists = getLists();
    const idx   = lists.findIndex(l => l.id === _managingListId);
    if (idx === -1) return;
    lists[idx].name = name;
    saveLists(lists);
    closeManageListModal();
    renderListTabs();
    loadProducts();
    showToast("✅ List renamed!");
}

async function deleteCurrentList() {
    const listId = _managingListId;
    if (!listId) return;

    const lists = getLists();
    if (lists.length <= 1) {
        showToast("You cannot delete the last list.", "error");
        return;
    }

    // Delete all products in this list from Supabase
    const { data: products } = await supabaseClient
        .from("products")
        .select("id, image_url")
        .eq("list_id", listId);

    if (products && products.length > 0) {
        await supabaseClient
            .from("products")
            .delete()
            .eq("list_id", listId);

        for (const p of products) {
            if (p.image_url) await deleteImage(p.image_url);
        }
    }

    // Remove from local list
    const newLists = lists.filter(l => l.id !== listId);
    saveLists(newLists);

    // Switch to first available list
    setActiveList(newLists[0].id);

    closeManageListModal();
    renderListTabs();
    loadProducts();
    showToast("🗑️ List deleted.");
}


// ==========================================
// LIGHTBOX
// ==========================================

function openLightbox(url) {
    document.getElementById("lightboxImg").src = url;
    document.getElementById("lightbox").classList.add("open");
}

function closeLightbox() {
    document.getElementById("lightbox").classList.remove("open");
    document.getElementById("lightboxImg").src = "";
}


// ==========================================
// EDIT PRODUCT
// ==========================================

async function editProduct(id) {

    const { data: product, error: loadError } =
        await supabaseClient
            .from("products")
            .select("*")
            .eq("id", id)
            .single();

    if (loadError) {
        console.error("EDIT LOAD ERROR:", loadError);
        showToast("Error loading product: " + loadError.message, "error");
        return;
    }

    document.getElementById("editId").value       = product.id;
    document.getElementById("editName").value     = product.product_name;
    document.getElementById("editBuyer").value    = product.buyer;
    document.getElementById("editQuantity").value = product.quantity;
    document.getElementById("editPrice").value    = product.price_each;
    document.getElementById("editLink").value     = product.product_link || "";
    document.getElementById("editNote").value     = product.note || "";

    document.getElementById("editModal").dataset.currentImageUrl = product.image_url || "";

    const editPreviewWrap = document.getElementById("editImagePreviewWrap");
    const editPreviewImg  = document.getElementById("editImagePreview");

    if (product.image_url) {
        editPreviewImg.src         = product.image_url;
        editPreviewWrap.style.display = "flex";
    } else {
        editPreviewWrap.style.display = "none";
        editPreviewImg.src            = "";
    }

    document.getElementById("editImageFile").value = "";
    document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
    document.getElementById("editModal").classList.remove("open");
}

async function saveEdit() {

    const id       = document.getElementById("editId").value;
    const name     = document.getElementById("editName").value.trim();
    const buyer    = document.getElementById("editBuyer").value.trim();
    const quantity = Number(document.getElementById("editQuantity").value);
    const price    = Number(document.getElementById("editPrice").value);
    const link     = document.getElementById("editLink").value.trim();
    const note     = document.getElementById("editNote").value.trim();

    const editImageFileInput = document.getElementById("editImageFile");
    const newImageFile       = editImageFileInput.files[0] || null;
    const currentImageUrl    = document.getElementById("editModal").dataset.currentImageUrl || "";
    const editPreviewWrap    = document.getElementById("editImagePreviewWrap");
    const imageRemoved       = editPreviewWrap.style.display === "none" && currentImageUrl !== "";

    if (!name)  { showToast("Product name is required.", "error"); return; }
    if (!buyer) { showToast("Buyer name is required.",   "error"); return; }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showToast("Quantity must be a positive whole number.", "error");
        return;
    }

    if (isNaN(price) || price < 0) {
        showToast("Please enter a valid price.", "error");
        return;
    }

    if (newImageFile) {
        const allowed = ["image/png", "image/jpeg"];
        if (!allowed.includes(newImageFile.type)) {
            showToast("Only PNG or JPG images are allowed.", "error");
            return;
        }
    }

    const btn       = document.getElementById("btnSaveEdit");
    btn.disabled    = true;
    btn.textContent = "Saving...";

    let imageUrl = currentImageUrl;

    if (newImageFile) {
        try {
            imageUrl = await uploadImage(newImageFile);
        } catch (err) {
            showToast("Image upload failed: " + err.message, "error");
            btn.disabled    = false;
            btn.textContent = "Save Changes";
            return;
        }
        if (currentImageUrl) await deleteImage(currentImageUrl);

    } else if (imageRemoved) {
        await deleteImage(currentImageUrl);
        imageUrl = null;
    }

    const { error: updateError } =
        await supabaseClient
            .from("products")
            .update({
                product_name: name,
                buyer:        buyer,
                quantity:     quantity,
                price_each:   price,
                product_link: link,
                note:         note,
                image_url:    imageUrl
            })
            .eq("id", id);

    if (updateError) {
        console.error("UPDATE ERROR:", updateError);
        showToast("Error updating product: " + updateError.message, "error");
        btn.disabled    = false;
        btn.textContent = "Save Changes";
        return;
    }

    btn.disabled    = false;
    btn.textContent = "Save Changes";

    closeEditModal();
    showToast("✅ Product updated!");
    loadProducts();
}


// ==========================================
// DELETE PRODUCT
// ==========================================

function openDeleteModal(id, name, imageUrl) {
    document.getElementById("deleteId").value               = id;
    document.getElementById("deleteImageUrl").value         = imageUrl;
    document.getElementById("deleteProductName").textContent = name;
    document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
    document.getElementById("deleteModal").classList.remove("open");
}

async function confirmDelete() {

    const id       = document.getElementById("deleteId").value;
    const imageUrl = document.getElementById("deleteImageUrl").value;

    const { error } =
        await supabaseClient
            .from("products")
            .delete()
            .eq("id", id);

    if (error) {
        console.error("DELETE ERROR:", error);
        showToast("Error deleting product: " + error.message, "error");
        return;
    }

    if (imageUrl) await deleteImage(imageUrl);

    closeDeleteModal();
    showToast("🗑️ Product deleted.");
    loadProducts();
}


// ==========================================
// CHANGE STATUS
// ==========================================

async function changeStatus(id, status, selectEl) {

    const { error } =
        await supabaseClient
            .from("products")
            .update({ status: status })
            .eq("id", id);

    if (error) {
        console.error("STATUS UPDATE ERROR:", error);
        showToast("Error changing status: " + error.message, "error");
        return;
    }

    selectEl.className =
        "status-select " +
        (status === "Bought" ? "status-bought" : "status-not-bought");

    loadProducts();
}


// ==========================================
// ESCAPE HTML (security)
// ==========================================

function escapeHtml(str) {
    return String(str)
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;")
        .replace(/'/g,  "&#39;");
}


// ==========================================
// CLOSE MODALS ON OVERLAY CLICK
// ==========================================

document.getElementById("editModal")
    .addEventListener("click", function(e) {
        if (e.target === this) closeEditModal();
    });

document.getElementById("deleteModal")
    .addEventListener("click", function(e) {
        if (e.target === this) closeDeleteModal();
    });

document.getElementById("bulkDeleteModal")
    .addEventListener("click", function(e) {
        if (e.target === this) closeBulkDeleteModal();
    });

document.getElementById("newListModal")
    .addEventListener("click", function(e) {
        if (e.target === this) closeNewListModal();
    });

document.getElementById("manageListModal")
    .addEventListener("click", function(e) {
        if (e.target === this) closeManageListModal();
    });

// Enter key in new list modal
document.getElementById("newListName")
    .addEventListener("keydown", function(e) {
        if (e.key === "Enter") createList();
    });

document.getElementById("manageListName")
    .addEventListener("keydown", function(e) {
        if (e.key === "Enter") renameCurrentList();
    });

// Close modals with Escape key
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        closeLightbox();
        closeEditModal();
        closeDeleteModal();
        closeBulkDeleteModal();
        closeNewListModal();
        closeManageListModal();
    }
});


// ==========================================
// ⚠️ SUPABASE MIGRATION NOTE
// ==========================================
// You need to add a `list_id` column to your `products` table.
// Run this SQL in your Supabase SQL editor:
//
//   ALTER TABLE products ADD COLUMN IF NOT EXISTS list_id TEXT DEFAULT 'default';
//
// This allows products to be separated by list.
// ==========================================
