import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, updateDoc, doc as firestoreDoc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
let productosCargados = [];

// Function to get URL parameters
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        sucursal: params.get('sucursal')
    };
}

// Set the sucursal from the URL
const { sucursal } = getQueryParams();
if (sucursal) {
    const sucursalInput = document.getElementById('sucursal');
    if (sucursalInput) {
        sucursalInput.value = sucursal;
    }
    const encargadoTitle = document.getElementById('encargado-title');
    if (encargadoTitle) {
        encargadoTitle.innerText += ` - ${sucursal.charAt(0).toUpperCase() + sucursal.slice(1)}`;
    }
}

const productsByBranch = {
    bodega: [
        { name: "Levadura", unit: "Caja", category: "Alimentos" },
        { name: "Salsa chicharronera", unit: "Bote", category: "Alimentos" },
        { name: "Piñas", unit: "Unidad", category: "Alimentos" },
        { name: "Barbacoa", unit: "Libra", category: "Alimentos" },
        { name: "Queso parmesano", unit: "Bote", category: "Alimentos" },
        { name: "Polvo rojo", unit: "Bolsa", category: "Alimentos" },
        { name: "5 quesos", unit: "Bolsa", category: "Alimentos" },
        { name: "Tomate deshidratado", unit: "Bote", category: "Alimentos" },
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
        } else if (menu === 'pedidosRecibidos') {
            cargarPedidosRecibidos();
        }
    }

    window.showMenu = showMenu;

    async function getNextPedidoId() {
        const counterDocRef = firestoreDoc(db, "counters", "pedidos");
        const counterDocSnap = await getDoc(counterDocRef);

        if (counterDocSnap.exists()) {
            const currentCount = counterDocSnap.data().count;
            await updateDoc(counterDocRef, { count: currentCount + 1 });
            return currentCount + 1;
        } else {
            await setDoc(counterDocRef, { count: 1 });
            return 1;
        }
    }

    async function registrarPedido(event) {
        event.preventDefault();

        const proveedor = document.getElementById('proveedor').value;
        const fechaPedido = new Date().toISOString().split('T')[0];  // Get current date in YYYY-MM-DD format

        const nextPedidoId = await getNextPedidoId();

        const nuevoPedido = {
            sucursal,
            proveedor,
            nombre: nextPedidoId.toString(),  // Use the next pedido ID as the name
            fecha: fechaPedido,
            estado: 'pendiente_confirmacion',
            productos: []
        };

        try {
            const docRef = await addDoc(collection(db, "pedidos"), nuevoPedido);
            currentPedidoId = docRef.id;

            productosPedido = [];
            document.getElementById('pedido-form').reset();
            document.getElementById('productos-list').innerHTML = '';
            alert('Pedido registrado exitosamente.');
            cargarProductos(proveedor);
            showMenu('productosPedido');
            cargarPedidosRealizados(); // Llamar a cargar pedidos realizados para actualizar la lista
        } catch (error) {
            console.error('Error al registrar pedido:', error);
        }
    }

    window.registrarPedido = registrarPedido;

    function cargarProductos(proveedor) {
        const productoSelect = document.getElementById('producto');
        const productos = productsByBranch[proveedor] || [];
        productosCargados = productos;  // Guardar productos cargados
        productoSelect.innerHTML = '';
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

        // Ensure the presentation field is updated initially
        if (productoSelect.value) {
            const selectedProduct = productos.find(p => p.name === productoSelect.value);
            if (selectedProduct) {
                document.getElementById('presentacion').value = selectedProduct.unit;
                document.getElementById('stock').value = ''; // Clear stock value
            }
        }
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

        // Reiniciar el buscador
        document.getElementById('buscarProducto').value = '';
        cargarProductos(document.getElementById('proveedor').value);
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
            showMenu('realizarPedido');
            cargarPedidosRealizados(); // Llamar a cargar pedidos realizados para actualizar la lista
        } catch (error) {
            console.error('Error al enviar pedido:', error);
        }
    }

    window.enviarPedido = enviarPedido;

    async function cancelarPedido() {
        if (currentPedidoId) {
            const pedidoRef = firestoreDoc(db, "pedidos", currentPedidoId);
            try {
                await deleteDoc(pedidoRef);
                alert('Pedido cancelado exitosamente.');
                showMenu('realizarPedido');
            } catch (error) {
                console.error('Error al cancelar pedido:', error);
            }
        }
    }

    window.cancelarPedido = cancelarPedido;

    async function cargarPedidosRealizados() {
        const pedidosConfirmados = document.getElementById('pedidos-confirmados');
        const pedidosPendientes = document.getElementById('pedidos-pendientes');
        pedidosConfirmados.innerHTML = '';
        pedidosPendientes.innerHTML = '';

        const q = query(collection(db, "pedidos"), where("sucursal", "==", sucursal), orderBy("fecha", "desc"));

        onSnapshot(q, (snapshot) => {
            pedidosConfirmados.innerHTML = '';
            pedidosPendientes.innerHTML = '';

            snapshot.forEach(doc => {
                const pedido = doc.data();
                const pedidoElement = document.createElement('div');
                pedidoElement.classList.add('card', 'mb-3');
                pedidoElement.innerHTML = `
                    <div class="card-header">
                        <h5 class="card-title">Pedido: ${pedido.nombre} (${pedido.proveedor} - ${pedido.fecha})</h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">Estado: ${pedido.estado === 'pendiente_confirmacion' ? 'Pendiente de Confirmación' : 'Confirmado'}</p>
                        <button class="btn btn-primary" onclick="mostrarProductos('${doc.id}')">Mostrar Pedido</button>
                        <button class="btn btn-success" onclick="confirmarPedido('${doc.id}')">Confirmar Pedido</button>
                        ${pedido.estado === 'confirmado' ? `
                            <button class="btn btn-secondary" onclick="abrirModal('${doc.id}')">Comprobar Pedido</button>
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
                                    </tr>
                                </thead>
                                <tbody id="productos-list-${doc.id}"></tbody>
                            </table>
                        </div>
                    </div>
                `;
                if (pedido.estado === 'pendiente_confirmacion') {
                    pedidosPendientes.appendChild(pedidoElement);
                } else if (pedido.estado === 'confirmado') {
                    pedidosConfirmados.appendChild(pedidoElement);
                }
            });
        });
    }

    window.cargarPedidosRealizados = cargarPedidosRealizados;

    async function mostrarProductos(docId) {
        const productosList = document.getElementById(`productos-list-${docId}`);
        const productosDiv = document.getElementById(`productos-${docId}`);
        if (productosDiv && productosList) {
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
        } else {
            console.error('Error: Element not found for docId', docId);
        }
    }

    window.mostrarProductos = mostrarProductos;

    async function confirmarPedido(docId) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            await updateDoc(pedidoRef, { estado: 'confirmado' });
            alert('Pedido confirmado exitosamente.');
            cargarPedidosRealizados(); // Llamar a cargar pedidos realizados para actualizar la lista
        } catch (error) {
            console.error('Error al confirmar pedido:', error);
        }
    }

    window.confirmarPedido = confirmarPedido;

    async function abrirModal(docId) {
        const modal = new bootstrap.Modal(document.getElementById('pedidoModal'));
        const productosList = document.getElementById('modal-productos-list');
        productosList.innerHTML = '';
    
        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
            const pedido = docSnap.data();
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
    
            const enviarDatosButton = document.getElementById('enviar-datos-recibidos');
            enviarDatosButton.onclick = function() {
                guardarDatosRecibidos(docId);
                modal.hide();
            };
    
            modal.show();
        } catch (error) {
            console.error('Error al comprobar pedido recibido:', error);
        }
    }
    
    window.abrirModal = abrirModal;

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
            cargarPedidosRealizados();
            cargarPedidosRecibidos();
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

    async function cargarPedidosRecibidos() {
        const pedidosRecibidos = document.getElementById('pedidos-list-recibidos');
        pedidosRecibidos.innerHTML = '';

        const q = query(collection(db, "pedidos"), where("sucursal", "==", sucursal), where("estado", "==", "verificado"), orderBy("fecha", "desc"));

        onSnapshot(q, (snapshot) => {
            pedidosRecibidos.innerHTML = '';

            snapshot.forEach(doc => {
                const pedido = doc.data();
                const pedidoElement = document.createElement('div');
                pedidoElement.classList.add('card', 'mb-3');
                pedidoElement.innerHTML = `
                    <div class="card-header">
                        <h5 class="card-title">Pedido: ${pedido.nombre} (${pedido.proveedor} - ${pedido.fecha})</h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">Estado: Completado</p>
                        <button class="btn btn-secondary" onclick="mostrarProductosRecibidos('${doc.id}')">Ver Pedido Recibido</button>
                        <button class="btn btn-success" onclick="descargarPedidoRecibido('${doc.id}', '${pedido.sucursal}', '${pedido.fecha}', '${pedido.proveedor}')">Descargar Pedido Recibido</button>
                    </div>
                    <div id="productos-recibidos-${doc.id}" class="card-body hidden">
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
                                <tbody id="productos-list-recibidos-${doc.id}"></tbody>
                            </table>
                        </div>
                    </div>
                `;
                pedidosRecibidos.appendChild(pedidoElement);
            });
        });
    }

    window.cargarPedidosRecibidos = cargarPedidosRecibidos;

    async function mostrarProductosRecibidos(docId) {
        const productosList = document.getElementById(`productos-list-recibidos-${docId}`);
        const productosDiv = document.getElementById(`productos-recibidos-${docId}`);
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
                        <td>${producto.cantidadRecibida || ''}</td>
                        <td>${producto.comentarios || ''}</td>
                    `;
                    productosList.appendChild(productoElement);
                });
            } catch (error) {
                console.error('Error al mostrar productos recibidos:', error);
            }
        }
    }

    window.mostrarProductosRecibidos = mostrarProductosRecibidos;

    cargarPedidosRealizados();
    cargarPedidosRecibidos();

    // Función para filtrar productos
    function filtrarProductos() {
        const searchTerm = document.getElementById('buscarProducto').value.toLowerCase();
        const productoSelect = document.getElementById('producto');
        productoSelect.innerHTML = ''; // Clear existing options

        const filteredProductos = productosCargados.filter(producto => 
            producto.name.toLowerCase().includes(searchTerm)
        );

        filteredProductos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.name;
            option.textContent = producto.name;
            option.dataset.unit = producto.unit;
            productoSelect.appendChild(option);
        });

        // Ensure the presentation field is updated
        if (productoSelect.value) {
            const selectedProduct = filteredProductos.find(p => p.name === productoSelect.value);
            if (selectedProduct) {
                document.getElementById('presentacion').value = selectedProduct.unit;
                document.getElementById('stock').value = ''; // Clear stock value
            }
        }
    }

    window.filtrarProductos = filtrarProductos;

    // Añadir llamada a cargarProductos cuando se seleccione un proveedor
    document.getElementById('proveedor').addEventListener('change', function() {
        cargarProductos(this.value);
    });

    // Llamada inicial para cargar productos del proveedor por defecto
    cargarProductos(document.getElementById('proveedor').value);
});
