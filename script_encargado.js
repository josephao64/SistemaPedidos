import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc as firestoreDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC30cL7JhZPaPyQjIttJmZ8D5cdblBSNhA",
    authDomain: "dbregistrofacturas.firebaseapp.com",
    projectId: "dbregistrofacturas",
    storageBucket: "dbregistrofacturas.appspot.com",
    messagingSenderId: "327045418700",
    appId: "1:327045418700:web:5d3dd45ea35008491afc69"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentPedidoId = null;
let productosPedido = [];

// Function to get URL parameters
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        sucursal: params.get('sucursal')
    };
}

// Set the sucursal from the URL
const { sucursal } = getQueryParams();
document.getElementById('sucursal').value = sucursal;
document.getElementById('encargado-title').innerText += ` - ${sucursal.charAt(0).toUpperCase() + sucursal.slice(1)}`;

const productsByBranch = {
    bodega: [
        { name: "Harina Trigo Saco 50 lbs", unit: "SACO 50 LIBRAS", category: "Harina" },
        { name: "Limpia Vidrios", unit: "UNIDAD", category: "Productos de Limpieza" },
        { name: "Detergente", unit: "UNIDAD", category: "Productos de Limpieza" },
    ],
    serpesa: [
        { name: "Salami Bolsa", unit: "BOLSA", category: "Carnes" },
    ],
    super_productos: [
        { name: "Tomato Pasta", unit: "UNIDAD", category: "Salsas y Condimentos" },
        { name: "Champiñones", unit: "UNIDAD", category: "Vegetales y Frutas" },
    ],
    calder: [
        { name: "Pizza Cheese Rallado 20 lbs", unit: "LIBRA", category: "Quesos" },
        { name: "Pizza Cheese Block 5 lbs", unit: "LIBRA", category: "Quesos" },
    ],
    carnicos: [
        { name: "Jamón Tipo Pizza Granel", unit: "LIBRA", category: "Carnes" },
        { name: "Tocino Rebanado Ahumado", unit: "LIBRA", category: "Carnes" },
    ],
    santa_lucia: [
        { name: "Topping Res de Vacio 5x1", unit: "UNIDAD", category: "Carnes" },
        { name: "Roastbest", unit: "UNIDAD", category: "Carnes" },
    ]
};

document.addEventListener("DOMContentLoaded", function() {
    function showMenu(menu) {
        document.querySelectorAll('main section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(menu).classList.remove('hidden');

        if (menu === 'pedidosRealizados') {
            cargarPedidosRealizados();
        }
    }

    window.showMenu = showMenu;

    async function registrarPedido(event) {
        event.preventDefault();

        const proveedor = document.getElementById('proveedor').value;
        const fechaPedido = document.getElementById('fecha_pedido').value;

        const nuevoPedido = { sucursal, proveedor, fecha: fechaPedido, estado: 'pendiente_confirmacion', productos: [] };
        
        try {
            const docRef = await addDoc(collection(db, "pedidos"), nuevoPedido);
            currentPedidoId = docRef.id;
            productosPedido = [];
            document.getElementById('pedido-form').reset();
            alert('Pedido registrado exitosamente.');
            cargarProductos(proveedor);
            showMenu('productosPedido');
        } catch (error) {
            console.error('Error al registrar pedido:', error);
        }
    }

    window.registrarPedido = registrarPedido;

    function cargarProductos(proveedor) {
        const productoSelect = document.getElementById('producto');
        productoSelect.innerHTML = '';
        const productos = productsByBranch[proveedor] || [];
        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.name;
            option.textContent = producto.name;
            option.dataset.unit = producto.unit;
            productoSelect.appendChild(option);
        });

        productoSelect.addEventListener('change', function() {
            const selectedProduct = productos.find(p => p.name === this.value);
            if (selectedProduct) {
                document.getElementById('presentacion').value = selectedProduct.unit;
                document.getElementById('stock').value = ''; // Clear stock value
            }
        });
    }

    async function agregarProducto(event) {
        event.preventDefault();

        const producto = document.getElementById('producto').value;
        const presentacion = document.getElementById('presentacion').value;
        const stock = parseInt(document.getElementById('stock').value, 10);
        const cantidad = parseInt(document.getElementById('cantidad').value, 10);

        if (!currentPedidoId) {
            alert('Debe registrar un pedido primero.');
            return;
        }

        const productoItem = { producto, presentacion, stock, cantidad };
        productosPedido.push(productoItem);

        actualizarListaProductos();
        document.getElementById('producto-form').reset();
    }

    window.agregarProducto = agregarProducto;

    function actualizarListaProductos() {
        const productosList = document.getElementById('productos-list');
        productosList.innerHTML = '';
        productosPedido.forEach((producto, index) => {
            const productoElement = document.createElement('tr');
            productoElement.innerHTML = `
                <td>${producto.producto}</td>
                <td>${producto.presentacion}</td>
                <td>${producto.stock}</td>
                <td>${producto.cantidad}</td>
                <td><button class="btn btn-danger" onclick="eliminarProducto(${index})">Eliminar</button></td>
            `;
            productosList.appendChild(productoElement);
        });
    }

    function eliminarProducto(index) {
        productosPedido.splice(index, 1);
        actualizarListaProductos();
    }

    window.eliminarProducto = eliminarProducto;

    async function enviarPedido() {
        if (!currentPedidoId) {
            alert('Debe registrar un pedido primero.');
            return;
        }

        const pedidoRef = firestoreDoc(db, "pedidos", currentPedidoId);

        try {
            await updateDoc(pedidoRef, {
                productos: productosPedido,
                estado: 'pendiente_confirmacion'
            });
            alert('Pedido enviado exitosamente.');
            cargarPedidosRealizados(); // Load and display pending orders
            showMenu('realizarPedido');
        } catch (error) {
            console.error('Error al enviar pedido:', error);
        }
    }

    window.enviarPedido = enviarPedido;

    async function cargarPedidosRealizados() {
        const pedidosConfirmados = document.getElementById('pedidos-confirmados');
        const pedidosPendientes = document.getElementById('pedidos-pendientes');
        pedidosConfirmados.innerHTML = '';
        pedidosPendientes.innerHTML = '';

        try {
            const q = query(collection(db, "pedidos"), where("sucursal", "==", sucursal));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const pedido = doc.data();
                const pedidoElement = document.createElement('div');
                pedidoElement.classList.add('card', 'mb-3');
                pedidoElement.innerHTML = `
                    <div class="card-header">
                        <h5 class="card-title">Pedido: ${pedido.sucursal} - ${pedido.proveedor} (${pedido.fecha})</h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">Estado: ${pedido.estado === 'pendiente_confirmacion' ? 'Pendiente de Confirmación' : 'Confirmado'}</p>
                        <button class="btn btn-primary" onclick="mostrarProductos('${doc.id}')">Mostrar Pedido</button>
                        <button class="btn btn-success" onclick="descargarPedido('${doc.id}', '${pedido.sucursal}', '${pedido.fecha}', '${pedido.proveedor}')">Descargar Pedido</button>
                        ${pedido.estado === 'confirmado' ? `
                            <button class="btn btn-secondary" onclick="comprobarPedidoRecibido('${doc.id}')">Comprobar Pedido Recibido</button>
                            <button class="btn btn-success" id="descargar-recibido-${doc.id}" onclick="descargarPedidoRecibido('${doc.id}', '${pedido.sucursal}', '${pedido.fecha}', '${pedido.proveedor}')">Descargar Pedido Recibido</button>
                        ` : ''}
                    </div>
                    <div id="productos-${doc.id}" class="card-body hidden">
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Presentación</th>
                                        <th>Cantidad</th>
                                        <th>Cantidad Recibida</th>
                                        <th>Comentarios</th>
                                    </tr>
                                </thead>
                                <tbody id="productos-list-${doc.id}"></tbody>
                            </table>
                        </div>
                        ${pedido.estado === 'confirmado' ? '<button class="btn btn-primary mt-2" onclick="guardarDatosRecibidos(\'' + doc.id + '\')">Enviar Datos Recibidos</button>' : ''}
                    </div>
                `;
                if (pedido.estado === 'pendiente_confirmacion') {
                    pedidosPendientes.appendChild(pedidoElement);
                } else {
                    pedidosConfirmados.appendChild(pedidoElement);
                }
            });
        } catch (error) {
            console.error('Error al cargar pedidos realizados:', error);
        }
    }

    window.cargarPedidosRealizados = cargarPedidosRealizados;

    async function mostrarProductos(docId) {
        const productosList = document.getElementById(`productos-list-${docId}`);
        const productosDiv = document.getElementById(`productos-${docId}`);
        productosDiv.classList.toggle('hidden');

        if (!productosDiv.classList.contains('hidden')) {
            try {
                const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
                const pedido = docSnap.data();
                productosList.innerHTML = '';
                pedido.productos.forEach(producto => {
                    const productoElement = document.createElement('tr');
                    productoElement.innerHTML = `
                        <td>${producto.producto}</td>
                        <td>${producto.presentacion}</td>
                        <td>${producto.cantidad}</td>
                    `;
                    productosList.appendChild(productoElement);
                });
            } catch (error) {
                console.error('Error al mostrar productos:', error);
            }
        }
    }

    window.mostrarProductos = mostrarProductos;

    async function comprobarPedidoRecibido(docId) {
        const productosList = document.getElementById(`productos-list-${docId}`);
        const productosDiv = document.getElementById(`productos-${docId}`);
        productosDiv.classList.toggle('hidden');

        if (!productosDiv.classList.contains('hidden')) {
            try {
                const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
                const pedido = docSnap.data();
                productosList.innerHTML = '';
                pedido.productos.forEach(producto => {
                    const productoElement = document.createElement('tr');
                    productoElement.innerHTML = `
                        <td>${producto.producto}</td>
                        <td>${producto.presentacion}</td>
                        <td>${producto.cantidad}</td>
                        <td><input type="number" value="${producto.cantidadRecibida || ''}" onchange="actualizarCantidadRecibida('${docId}', '${producto.producto}', this.value)"></td>
                        <td><input type="text" value="${producto.comentarios || ''}" onchange="actualizarComentarios('${docId}', '${producto.producto}', this.value)"></td>
                    `;
                    productosList.appendChild(productoElement);
                });
            } catch (error) {
                console.error('Error al comprobar pedido recibido:', error);
            }
        }
    }

    window.comprobarPedidoRecibido = comprobarPedidoRecibido;

    async function actualizarCantidadRecibida(docId, producto, cantidadRecibida) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos.map(p => {
                if (p.producto === producto) {
                    p.cantidadRecibida = cantidadRecibida;
                }
                return p;
            });
            await updateDoc(pedidoRef, { productos });
        } catch (error) {
            console.error('Error al actualizar cantidad recibida:', error);
        }
    }

    window.actualizarCantidadRecibida = actualizarCantidadRecibida;

    async function actualizarComentarios(docId, producto, comentarios) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos.map(p => {
                if (p.producto === producto) {
                    p.comentarios = comentarios;
                }
                return p;
            });
            await updateDoc(pedidoRef, { productos });
        } catch (error) {
            console.error('Error al actualizar comentarios:', error);
        }
    }

    window.actualizarComentarios = actualizarComentarios;

    async function guardarDatosRecibidos(docId) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos.map(p => {
                return {
                    ...p,
                    cantidadRecibida: p.cantidadRecibida || 0,
                    comentarios: p.comentarios || ''
                };
            });
            await updateDoc(pedidoRef, { productos, estado: 'verificado' });
            alert('Datos recibidos guardados exitosamente.');
            cargarPedidosRealizados(); // Refresh the list
            document.getElementById(`descargar-recibido-${docId}`).style.display = 'inline-block';
        } catch (error) {
            console.error('Error al guardar datos recibidos:', error);
        }
    }

    window.guardarDatosRecibidos = guardarDatosRecibidos;

    function descargarPedido(docId, sucursal, fecha, proveedor) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        getDoc(pedidoRef).then(docSnap => {
            const pedido = docSnap.data();
            const doc = convertToPDF(pedido.productos, false, sucursal, fecha, proveedor);
            doc.save(`pedido_${docId}.pdf`);
        }).catch(error => {
            console.error('Error al descargar pedido:', error);
        });
    }

    window.descargarPedido = descargarPedido;

    function descargarPedidoRecibido(docId, sucursal, fecha, proveedor) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        getDoc(pedidoRef).then(docSnap => {
            const pedido = docSnap.data();
            const doc = convertToPDF(pedido.productos, true, sucursal, fecha, proveedor);
            doc.save(`pedido_recibido_${docId}.pdf`);
        }).catch(error => {
            console.error('Error al descargar pedido recibido:', error);
        });
    }

    window.descargarPedidoRecibido = descargarPedidoRecibido;

    function convertToPDF(productos, includeReceived, sucursal, fecha, proveedor) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const headers = ['Producto', 'Presentación', 'Cantidad'];
        if (includeReceived) {
            headers.push('Cantidad Recibida', 'Comentarios');
        }

        const rows = productos.map(producto => {
            const row = [producto.producto, producto.presentacion, producto.cantidad];
            if (includeReceived) {
                row.push(producto.cantidadRecibida || 'N/A', producto.comentarios || 'Ninguno');
            }
            return row;
        });

        doc.setFontSize(16);
        doc.text('Reporte de Pedido', 14, 16);
        doc.setFontSize(12);
        doc.text(`Sucursal: ${sucursal}`, 14, 26);
        doc.text(`Fecha: ${fecha}`, 14, 32);
        doc.text(`Proveedor: ${proveedor}`, 14, 38);

        doc.autoTable({
            startY: 45,
            head: [headers],
            body: rows
        });

        return doc;
    }

    cargarPedidosRealizados();
});
