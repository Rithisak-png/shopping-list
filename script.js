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
        alert("Please enter product name.");
        return;
    }

    if (buyer === "") {
        alert("Please enter buyer name.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("Quantity must be greater than 0.");
        return;
    }

    if (isNaN(price) || price < 0) {
        alert("Please enter a valid price.");
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
                    buyer: buyer,
                    quantity: quantity,
                    price_each: price,
                    product_link: link,
                    image_url: null,
                    status: "Not Bought"
                }
            ])
            .select();


    // --------------------------------------
    // CHECK ERROR
    // --------------------------------------

    if (error) {

        console.error("ADD PRODUCT ERROR:", error);

        alert(
            "Error adding product:\n" +
            error.message
        );

        return;
    }


    console.log("Product added:", data);

    alert("✅ Product added!");


    // --------------------------------------
    // CLEAR FORM
    // --------------------------------------

    document.getElementById("productName").value = "";
    document.getElementById("buyer").value = "";
    document.getElementById("quantity").value = 1;
    document.getElementById("price").value = "";
    document.getElementById("link").value = "";

    // Clear image input if it exists
    const imageInput =
        document.getElementById("image");

    if (imageInput) {
        imageInput.value = "";
    }


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
        sortSelect
            ? sortSelect.value
            : "newest";


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
            {
                ascending: true
            }
        );

    } else if (sortValue === "za") {

        query = query.order(
            "product_name",
            {
                ascending: false
            }
        );

    } else {

        query = query.order(
            "created_at",
            {
                ascending: false
            }
        );
    }


    // --------------------------------------
    // GET DATA
    // --------------------------------------

    const { data, error } =
        await query;


    if (error) {

        console.error(
            "LOAD PRODUCTS ERROR:",
            error
        );

        alert(
            "Error loading products:\n" +
            error.message
        );

        return;
    }


    // --------------------------------------
    // TABLE
    // --------------------------------------

    const table =
        document.getElementById("productTable");

    table.innerHTML = "";


    // --------------------------------------
    // GRAND TOTAL
    // --------------------------------------

    let grandTotal = 0;


    // --------------------------------------
    // DISPLAY PRODUCTS
    // --------------------------------------

    data.forEach(product => {

        const quantity =
            Number(product.quantity);

        const price =
            Number(product.price_each);

        const total =
            quantity * price;

        grandTotal += total;


        // Create row
        const row =
            document.createElement("tr");


        // ----------------------------------
        // IMAGE
        // ----------------------------------

        let imageHTML = "No image";

        if (product.image_url) {

            imageHTML = `
                <img
                    src="${product.image_url}"
                    alt="${product.product_name}"
                    style="
                        width:80px;
                        height:80px;
                        object-fit:cover;
                        border-radius:8px;
                    "
                >
            `;
        }


        // ----------------------------------
        // PRODUCT ROW
        // ----------------------------------

        row.innerHTML = `

            <td>
                ${imageHTML}
            </td>

            <td>
                ${product.product_name}
            </td>

            <td>
                ${product.buyer}
            </td>

            <td>
                ${quantity}
            </td>

            <td>
                $${price.toFixed(2)}
            </td>

            <td>
                $${total.toFixed(2)}
            </td>

            <td>
                ${
                    product.product_link
                    ?
                    `
                    <a
                        href="${product.product_link}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open Link
                    </a>
                    `
                    :
                    "No link"
                }
            </td>

            <td>

                <select
                    onchange="
                        changeStatus(
                            ${product.id},
                            this.value
                        )
                    "
                >

                    <option
                        value="Not Bought"
                        ${
                            product.status === "Not Bought"
                            ? "selected"
                            : ""
                        }
                    >
                        Not Bought
                    </option>

                    <option
                        value="Bought"
                        ${
                            product.status === "Bought"
                            ? "selected"
                            : ""
                        }
                    >
                        Bought
                    </option>

                </select>

            </td>

            <td>

                <button
                    onclick="editProduct(${product.id})"
                >
                    ✏️ Edit
                </button>

                <button
                    onclick="deleteProduct(${product.id})"
                >
                    🗑️ Delete
                </button>

            </td>
        `;


        table.appendChild(row);

    });


    // --------------------------------------
    // SHOW GRAND TOTAL
    // --------------------------------------

    document.getElementById("grandTotal")
        .textContent =
        grandTotal.toFixed(2);
}


// ==========================================
// EDIT PRODUCT
// ==========================================

async function editProduct(id) {

    // Get current product
    const {
        data: product,
        error: loadError
    } =
        await supabaseClient
            .from("products")
            .select("*")
            .eq("id", id)
            .single();


    if (loadError) {

        console.error(
            "EDIT LOAD ERROR:",
            loadError
        );

        alert(
            "Error loading product:\n" +
            loadError.message
        );

        return;
    }


    // --------------------------------------
    // PRODUCT NAME
    // --------------------------------------

    const productName =
        prompt(
            "Product Name:",
            product.product_name
        );

    if (productName === null) {
        return;
    }


    // --------------------------------------
    // BUYER
    // --------------------------------------

    const buyer =
        prompt(
            "Buyer:",
            product.buyer
        );

    if (buyer === null) {
        return;
    }


    // --------------------------------------
    // QUANTITY
    // --------------------------------------

    const quantityInput =
        prompt(
            "Quantity:",
            product.quantity
        );

    if (quantityInput === null) {
        return;
    }

    const quantity =
        Number(quantityInput);

    if (!Number.isInteger(quantity) || quantity <= 0) {

        alert(
            "Quantity must be a positive whole number."
        );

        return;
    }


    // --------------------------------------
    // PRICE
    // --------------------------------------

    const priceInput =
        prompt(
            "Price Each:",
            product.price_each
        );

    if (priceInput === null) {
        return;
    }

    const price =
        Number(priceInput);

    if (isNaN(price) || price < 0) {

        alert(
            "Please enter a valid price."
        );

        return;
    }


    // --------------------------------------
    // PRODUCT LINK
    // --------------------------------------

    const link =
        prompt(
            "Product Link:",
            product.product_link || ""
        );

    if (link === null) {
        return;
    }


    // --------------------------------------
    // UPDATE DATABASE
    // --------------------------------------

    const { error: updateError } =
        await supabaseClient
            .from("products")
            .update({
                product_name: productName.trim(),
                buyer: buyer.trim(),
                quantity: quantity,
                price_each: price,
                product_link: link.trim()
            })
            .eq("id", id);


    if (updateError) {

        console.error(
            "UPDATE ERROR:",
            updateError
        );

        alert(
            "Error updating product:\n" +
            updateError.message
        );

        return;
    }


    alert("✅ Product updated!");

    loadProducts();
}


// ==========================================
// DELETE PRODUCT
// ==========================================

async function deleteProduct(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmDelete) {
        return;
    }


    const { error } =
        await supabaseClient
            .from("products")
            .delete()
            .eq("id", id);


    if (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        alert(
            "Error deleting product:\n" +
            error.message
        );

        return;
    }


    alert("🗑️ Product deleted!");

    loadProducts();
}


// ==========================================
// CHANGE STATUS
// ==========================================

async function changeStatus(id, status) {

    const { error } =
        await supabaseClient
            .from("products")
            .update({
                status: status
            })
            .eq("id", id);


    if (error) {

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );

        alert(
            "Error changing status:\n" +
            error.message
        );

        return;
    }


    loadProducts();
}


// ==========================================
// START WEBSITE
// ==========================================

loadProducts();
