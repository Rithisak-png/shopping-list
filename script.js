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

    document.getElementById("pinInput").value          = "";
    document.getElementById("loginError").style.display = "none";
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

    // Create unique filename: timestamp + original name
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

    // Get public URL
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

    // Extract file path from URL
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

    // Validate image type
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
            btn.disabled    = false;
            btn.innerHTML   = "<span>+</span> Add Product";
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
                status:       "Not Bought"
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


    // --------------------------------------
    // BUILD QUERY
    // --------------------------------------

    let query = supabaseClient.from("products").select("*");

    if (sortValue === "az") {
        query = query.order("product_name", { ascending: true  });
    } else if (sortValue === "za") {
        query = query.order("product_name", { ascending: false });
    } else {
        query = query.order("created_at",   { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
        console.error("LOAD PRODUCTS ERROR:", error);
        showToast("Error loading products: " + error.message, "error");
        return;
    }


    // --------------------------------------
    // RENDER TABLE
    // --------------------------------------

    const table = document.getElementById("productTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="10">
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

    let grandTotal = 0;

    data.forEach(product => {

        const quantity  = Number(product.quantity);
        const price     = Number(product.price_each);
        const total     = quantity * price;
        grandTotal     += total;

        const row = document.createElement("tr");


        // ----------------------------------
        // IMAGE CELL
        // ----------------------------------

        const imgCell = product.image_url
            ? `<img
                   src="${product.image_url}"
                   alt="${escapeHtml(product.product_name)}"
                   class="product-img"
                   onclick="openLightbox('${product.image_url}')"
               >`
            : `<div class="no-img">📦</div>`;


        // ----------------------------------
        // LINK CELL
        // ----------------------------------

        const linkCell = product.product_link
            ? `<a href="${product.product_link}" target="_blank" rel="noopener noreferrer" class="link-btn">🔗 Open</a>`
            : `<span style="color:var(--text-muted);font-size:12px">—</span>`;


        // ----------------------------------
        // NOTE CELL
        // ----------------------------------

        const noteCell = product.note
            ? `<span class="note-cell" title="${escapeHtml(product.note)}">${escapeHtml(product.note)}</span>`
            : `<span style="color:var(--text-muted);font-size:12px">—</span>`;


        // ----------------------------------
        // STATUS
        // ----------------------------------

        const statusClass = product.status === "Bought"
            ? "status-bought"
            : "status-not-bought";


        // ----------------------------------
        // ROW HTML
        // ----------------------------------

        row.innerHTML = `
            <td>${imgCell}</td>
            <td class="product-name">${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.buyer)}</td>
            <td>${quantity}</td>
            <td>$${price.toFixed(2)}</td>
            <td><strong>$${total.toFixed(2)}</strong></td>
            <td>${linkCell}</td>
            <td>${noteCell}</td>
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
                    <button class="btn-del"  onclick="openDeleteModal(${product.id}, '${escapeHtml(product.product_name)}', '${product.image_url || ""}')">🗑️ Delete</button>
                </div>
            </td>
        `;

        table.appendChild(row);
    });

    document.getElementById("grandTotal").textContent = grandTotal.toFixed(2);
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
// LIGHTBOX (full-size image)
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


    // --------------------------------------
    // FILL MODAL FIELDS
    // --------------------------------------

    document.getElementById("editId").value       = product.id;
    document.getElementById("editName").value     = product.product_name;
    document.getElementById("editBuyer").value    = product.buyer;
    document.getElementById("editQuantity").value = product.quantity;
    document.getElementById("editPrice").value    = product.price_each;
    document.getElementById("editLink").value     = product.product_link || "";
    document.getElementById("editNote").value     = product.note || "";

    // Store current image URL so we know whether to replace it
    document.getElementById("editModal").dataset.currentImageUrl = product.image_url || "";

    // Show current image in preview if it exists
    const editPreviewWrap = document.getElementById("editImagePreviewWrap");
    const editPreviewImg  = document.getElementById("editImagePreview");

    if (product.image_url) {
        editPreviewImg.src         = product.image_url;
        editPreviewWrap.style.display = "flex";
    } else {
        editPreviewWrap.style.display = "none";
        editPreviewImg.src            = "";
    }

    // Reset file input
    document.getElementById("editImageFile").value = "";


    // --------------------------------------
    // OPEN MODAL
    // --------------------------------------

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

    const editImageFileInput =
        document.getElementById("editImageFile");

    const newImageFile =
        editImageFileInput.files[0] || null;

    const currentImageUrl =
        document.getElementById("editModal").dataset.currentImageUrl || "";

    // Is the "remove image" button used? Check preview hidden
    const editPreviewWrap =
        document.getElementById("editImagePreviewWrap");

    const imageRemoved =
        editPreviewWrap.style.display === "none" && currentImageUrl !== "";


    // --------------------------------------
    // VALIDATE
    // --------------------------------------

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


    // --------------------------------------
    // DISABLE SAVE BUTTON
    // --------------------------------------

    const btn       = document.getElementById("btnSaveEdit");
    btn.disabled    = true;
    btn.textContent = "Saving...";


    // --------------------------------------
    // HANDLE IMAGE
    // --------------------------------------

    let imageUrl = currentImageUrl;

    if (newImageFile) {

        // Upload new image
        try {
            imageUrl = await uploadImage(newImageFile);
        } catch (err) {
            showToast("Image upload failed: " + err.message, "error");
            btn.disabled    = false;
            btn.textContent = "Save Changes";
            return;
        }

        // Delete old image from storage
        if (currentImageUrl) {
            await deleteImage(currentImageUrl);
        }

    } else if (imageRemoved) {

        // User clicked Remove — delete from storage and clear URL
        await deleteImage(currentImageUrl);
        imageUrl = null;
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

    document.getElementById("deleteId").value           = id;
    document.getElementById("deleteImageUrl").value     = imageUrl;
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

    // Delete image from storage too
    if (imageUrl) {
        await deleteImage(imageUrl);
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

// Close lightbox with Escape key
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        closeLightbox();
        closeEditModal();
        closeDeleteModal();
    }
});
