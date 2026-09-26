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

    document.getElementById("pinInput").value         = "";
    document.getElementById("loginError").style.display = "none";
}

function togglePin() {

    const input =
        document.getElementById("pinInput");

    input.type =
        input.type === "password" ? "text" : "password";
}


// ==========================================
// TOAST NOTIFICATION
// ==========================================

function showToast(message, type = "success") {

    const old = document.querySelector(".toast");
    if (old) old.remove();

    const t = document.createElement("div");
    t.className  = `toast toast-${type}`;
    t.textContent = message;
    document.body.appendChild(t);

    setTimeout(() => t.remove(), 3000);
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


    // --------------------------------------
    // CHECK INPUT
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


    // --------------------------------------
    // SAVE TO DATABASE
    // --------------------------------------

    const { data, error } =
        await supabaseClient
            .from("products")
            .insert([
                {
                    product_name: productName,
                    buyer:        buyer,
                    quantity:     quantity,
                    price_each:   price,
                    product_link: link,
                    image_url:    null,
                    status:       "Not Bought"
                }
            ])
            .select();


    // --------------------------------------
    // CHECK ERROR
    // --------------------------------------

    if (error) {
        console.error("ADD PRODUCT ERROR:", error);
        showToast("Error adding product: " + error.message, "error");
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

    const imageInput = document.getElementById("image");
    if (imageInput) imageInput.value = "";


    // --------------------------------------
    // RELOAD TABLE
    // --------------------------------------

    loadProducts();
}


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {

    const sortSelect =
        document.getElementById("sortSelect");

    const sortValue =
        sortSelect ? sortSelect.value : "newest";


    // --------------------------------------
    // CREATE QUERY
    // --------------------------------------

    let query =
        supabaseClient
            .from("products")
            .select("*");


    // --------------------------------------
    // SORT
    // --------------------------------------

    if (sortValue === "az") {

        query = query.order(
            "product_name",
            { ascending: true }
        );

    } else if (sortValue === "za") {

        query = query.order(
            "product_name",
            { ascending: false }
        );

    } else {

        query = query.order(
            "created_at",
            { ascending: false }
        );
    }


    // --------------------------------------
    // GET DATA
    // --------------------------------------

    const { data, error } = await query;

    if (error) {
        console.error("LOAD PRODUCTS ERROR:", error);
        showToast("Error loading products: " + error.message, "error");
        return;
    }


    // --------------------------------------
    // TABLE
    // --------------------------------------

    const table =
        document.getElementById("productTable");

    table.innerHTML = "";


    // --------------------------------------
    // EMPTY STATE
    // --------------------------------------

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <div style="font-size:40px">📋</div>
                        <p>No products yet. Add one above!</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById("grandTotal").textContent = "0.00";
        return;
    }


    // --------------------------------------
    // GRAND TOTAL
    // --------------------------------------

    let grandTotal = 0;


    // --------------------------------------
    // DISPLAY PRODUCTS
    // --------------------------------------

    data.forEach(product => {

        const quantity = Number(product.quantity);
        const price    = Number(product.price_each);
        const total    = quantity * price;
        grandTotal    += total;


        // Create row
        const row = document.createElement("tr");


        // ----------------------------------
        // IMAGE
        // ----------------------------------

        const imgCell = product.image_url
            ? `<img src="${product.image_url}" alt="${product.product_name}" class="product-img">`
            : `<div class="no-img">📦</div>`;


        // ----------------------------------
        // LINK
        // ----------------------------------

        const linkCell = product.product_link
            ? `<a href="${product.product_link}" target="_blank" rel="noopener noreferrer" class="link-btn">🔗 Open</a>`
            : `<span style="color:var(--text-muted);font-size:12px">—</span>`;


        // ----------------------------------
        // STATUS CLASS
        // ----------------------------------

        const statusClass =
            product.status === "Bought"
                ? "status-bought"
                : "status-not-bought";


        // ----------------------------------
        // PRODUCT ROW
        // ----------------------------------

        row.innerHTML = `
            <td>${imgCell}</td>
            <td class="product-name">${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.buyer)}</td>
            <td>${quantity}</td>
            <td>$${price.toFixed(2)}</td>
            <td><strong>$${total.toFixed(2)}</strong></td>
            <td>${linkCell}</td>
            <td>
                <select
                    class="status-select ${statusClass}"
                    onchange="changeStatus(${product.id}, this.value, this)"
                >
                    <option value="Not Bought" ${product.status === "Not Bought" ? "selected" : ""}>Not Bought</option>
                    <option value="Bought"     ${product.status === "Bought"     ? "selected" : ""}>Bought</option>
                </select>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editProduct(${product.id})">✏️ Edit</button>
                    <button class="btn-del"  onclick="openDeleteModal(${product.id}, '${escapeHtml(product.product_name)}')">🗑️ Delete</button>
                </div>
            </td>
        `;

        table.appendChild(row);
    });


    // --------------------------------------
    // SHOW GRAND TOTAL
    // --------------------------------------

    document.getElementById("grandTotal")
        .textContent = grandTotal.toFixed(2);
}


// ==========================================
// ESCAPE HTML (security helper)
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
// EDIT PRODUCT — uses modal
// ==========================================

async function editProduct(id) {

    // Get current product
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


    // --------------------------------------
    // FILL MODAL FIELDS
    // --------------------------------------

    document.getElementById("editId").value       = product.id;
    document.getElementById("editName").value     = product.product_name;
    document.getElementById("editBuyer").value    = product.buyer;
    document.getElementById("editQuantity").value = product.quantity;
    document.getElementById("editPrice").value    = product.price_each;
    document.getElementById("editLink").value     = product.product_link || "";


    // --------------------------------------
    // OPEN MODAL
    // --------------------------------------

    document.getElementById("editModal")
        .classList.add("open");
}

function closeEditModal() {
    document.getElementById("editModal")
        .classList.remove("open");
}

async function saveEdit() {

    const id       = document.getElementById("editId").value;
    const name     = document.getElementById("editName").value.trim();
    const buyer    = document.getElementById("editBuyer").value.trim();
    const quantity = Number(document.getElementById("editQuantity").value);
    const price    = Number(document.getElementById("editPrice").value);
    const link     = document.getElementById("editLink").value.trim();


    // --------------------------------------
    // VALIDATE
    // --------------------------------------

    if (!name) {
        showToast("Product name is required.", "error");
        return;
    }

    if (!buyer) {
        showToast("Buyer name is required.", "error");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showToast("Quantity must be a positive whole number.", "error");
        return;
    }

    if (isNaN(price) || price < 0) {
        showToast("Please enter a valid price.", "error");
        return;
    }


    // --------------------------------------
    // UPDATE DATABASE
    // --------------------------------------

    const { error: updateError } =
        await supabaseClient
            .from("products")
            .update({
                product_name: name,
                buyer:        buyer,
                quantity:     quantity,
                price_each:   price,
                product_link: link
            })
            .eq("id", id);

    if (updateError) {
        console.error("UPDATE ERROR:", updateError);
        showToast("Error updating product: " + updateError.message, "error");
        return;
    }


    closeEditModal();
    showToast("✅ Product updated!");
    loadProducts();
}


// ==========================================
// DELETE PRODUCT — uses modal
// ==========================================

function openDeleteModal(id, name) {

    document.getElementById("deleteId").value = id;

    document.getElementById("deleteProductName")
        .textContent = name;

    document.getElementById("deleteModal")
        .classList.add("open");
}

function closeDeleteModal() {
    document.getElementById("deleteModal")
        .classList.remove("open");
}

async function confirmDelete() {

    const id =
        document.getElementById("deleteId").value;

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

    // Update pill color immediately
    selectEl.className =
        "status-select " +
        (status === "Bought" ? "status-bought" : "status-not-bought");

    loadProducts();
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


// ==========================================
// START WEBSITE
// ==========================================

// (loadProducts is called after login — not on page load,
//  because the user must enter the PIN first)
