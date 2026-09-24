// ==============================
// SUPABASE CONNECTION
// ==============================

const SUPABASE_URL = "https://qxbxupwcqycepcvgoxae.supabase.co";

const SUPABASE_KEY = "sb_publishable_ObRhdGjAvHqTxEKjXxn5hg_3FmQeteQ";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==============================
// ADD PRODUCT
// ==============================

async function addProduct() {

    console.log("Add Product clicked!");

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


    // Check input
    if (productName === "") {
        alert("Please enter product name.");
        return;
    }

    if (buyer === "") {
        alert("Please enter buyer name.");
        return;
    }

    if (quantity <= 0) {
        alert("Quantity must be greater than 0.");
        return;
    }

    if (price < 0 || isNaN(price)) {
        alert("Please enter a valid price.");
        return;
    }


    // Save to Supabase
    const { data, error } = await supabaseClient
        .from("products")
        .insert([
            {
                product_name: productName,
                buyer: buyer,
                quantity: quantity,
                price_each: price,
                product_link: link,
                status: "Not Bought"
            }
        ])
        .select();


    // Check error
    if (error) {

        console.error("SUPABASE ERROR:", error);

        alert("Error:\n" + error.message);

        return;
    }


    console.log("Product saved:", data);

    alert("✅ Product saved!");


    // Clear form
    document.getElementById("productName").value = "";

    document.getElementById("buyer").value = "";

    document.getElementById("quantity").value = 1;

    document.getElementById("price").value = "";

    document.getElementById("link").value = "";

    document.getElementById("image").value = "";


    // Reload table
    loadProducts();
}


// ==============================
// LOAD PRODUCTS
// ==============================

async function loadProducts() {

    console.log("Loading products...");


    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error("LOAD ERROR:", error);

        alert("Error loading products:\n" + error.message);

        return;
    }


    console.log("Products:", data);


    const table =
        document.getElementById("productTable");

    table.innerHTML = "";


    let grandTotal = 0;


    data.forEach(product => {

        const total =
            Number(product.quantity) *
            Number(product.price_each);

        grandTotal += total;


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                No image
            </td>

            <td>
                ${product.product_name}
            </td>

            <td>
                ${product.buyer}
            </td>

            <td>
                ${product.quantity}
            </td>

            <td>
                $${Number(product.price_each).toFixed(2)}
            </td>

            <td>
                $${total.toFixed(2)}
            </td>

            <td>
                ${
                    product.product_link
                    ? `<a href="${product.product_link}"
                          target="_blank">
                          Open Link
                       </a>`
                    : "No link"
                }
            </td>

            <td>

                <select
                    onchange="changeStatus(${product.id}, this.value)"
                >

                    <option
                        value="Not Bought"
                        ${product.status === "Not Bought" ? "selected" : ""}
                    >
                        Not Bought
                    </option>

                    <option
                        value="Bought"
                        ${product.status === "Bought" ? "selected" : ""}
                    >
                        Bought
                    </option>

                </select>

            </td>

            <td>

                <button
                    onclick="deleteProduct(${product.id})"
                >
                    Delete
                </button>

            </td>

        `;


        table.appendChild(row);

    });


    document.getElementById("grandTotal").textContent =
        grandTotal.toFixed(2);
}


// ==============================
// DELETE PRODUCT
// ==============================

async function deleteProduct(id) {

    const confirmDelete =
        confirm("Delete this product?");

    if (!confirmDelete) {
        return;
    }


    const { error } =
        await supabaseClient
            .from("products")
            .delete()
            .eq("id", id);


    if (error) {

        console.error(error);

        alert("Delete error:\n" + error.message);

        return;
    }


    loadProducts();
}


// ==============================
// CHANGE STATUS
// ==============================

async function changeStatus(id, status) {

    const { error } =
        await supabaseClient
            .from("products")
            .update({
                status: status
            })
            .eq("id", id);


    if (error) {

        console.error(error);

        alert("Status update error:\n" + error.message);

        return;
    }


    loadProducts();
}


// ==============================
// START WEBSITE
// ==============================

loadProducts();