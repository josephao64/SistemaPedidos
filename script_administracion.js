import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, arrayUnion, doc as firestoreDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", function() {
    function showMenu(menu) {
        document.querySelectorAll('main section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(menu).classList.remove('hidden');
    }

    window.showMenu = showMenu;

    async function cargarPedidos() {
        const filtroSucursal = document.getElementById('filtro-sucursal').value;
        const pedidosPendientes = document.getElementById('pedidos-list-pendientes');
        const pedidosConfirmados = document.getElementById('pedidos-list-confirmados');
        const pedidosCompletados = document.getElementById('pedidos-list-completados');

        pedidosPendientes.innerHTML = '';
        pedidosConfirmados.innerHTML = '';
        pedidosCompletados.innerHTML = '';

        try {
            let q;
            if (filtroSucursal === 'general') {
                q = query(collection(db, "pedidos"));
            } else {
                q = query(collection(db, "pedidos"), where("sucursal", "==", filtroSucursal));
            }
            
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
                        <p class="card-text">Estado: ${pedido.estado === 'pendiente_confirmacion' ? 'Pendiente de Confirmación' : pedido.estado === 'confirmado' ? 'Confirmado' : 'Completado'}</p>
                        <button class="btn btn-primary" onclick="revisarPedidoRealizado('${doc.id}')">Revisar Pedido</button>
                        <button class="btn btn-danger" onclick="eliminarPedido('${doc.id}')">Eliminar Pedido</button>
                        <button class="btn btn-success" onclick="exportarPedidoPDF('${doc.id}', '${pedido.sucursal}', '${pedido.fecha}', '${pedido.proveedor}')">Exportar a PDF</button>
                    </div>
                    <div id="productos-${doc.id}" class="card-body hidden">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Presentación</th>
                                    <th>Cantidad</th>
                                    ${pedido.estado === 'confirmado' ? '<th>Cantidad Recibida</th><th>Comentarios</th>' : ''}
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="productos-list-${doc.id}"></tbody>
                        </table>
                        ${pedido.estado === 'pendiente_confirmacion' ? '<button class="btn btn-primary mt-2" onclick="confirmarPedido(\'' + doc.id + '\')">Confirmar Pedido</button>' : ''}
                        ${pedido.estado === 'verificado' ? '<button class="btn btn-secondary mt-2" onclick="verificarProductoEntregado(\'' + doc.id + '\')">Revisar Productos Recibidos</button>' : ''}
                    </div>
                `;
                if (pedido.estado === 'pendiente_confirmacion') {
                    pedidosPendientes.appendChild(pedidoElement);
                } else if (pedido.estado === 'confirmado') {
                    pedidosConfirmados.appendChild(pedidoElement);
                } else if (pedido.estado === 'completado') {
                    pedidosCompletados.appendChild(pedidoElement);
                }
            });
        } catch (error) {
            console.error('Error al cargar pedidos:', error);
        }
    }

    window.cargarPedidos = cargarPedidos;

    async function revisarPedidoRealizado(docId) {
        const productosList = document.getElementById(`productos-list-${docId}`);
        const productosDiv = document.getElementById(`productos-${docId}`);
        productosDiv.classList.toggle('hidden');

        if (!productosDiv.classList.contains('hidden')) {
            try {
                const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
                const pedido = docSnap.data();
                productosList.innerHTML = '';
                pedido.productos.forEach((producto, index) => {
                    const productoElement = document.createElement('tr');
                    productoElement.innerHTML = `
                        <td>${producto.producto}</td>
                        <td>${producto.presentacion}</td>
                        <td><input type="number" value="${producto.cantidad}" onchange="actualizarCantidad('${docId}', '${producto.producto}', this.value)"></td>
                        <td><button class="btn btn-warning" onclick="editarProducto('${docId}', ${index})">Editar</button></td>
                        <td><button class="btn btn-danger" onclick="eliminarProducto('${docId}', ${index})">Eliminar</button></td>
                    `;
                    productosList.appendChild(productoElement);
                });
                const addProductForm = document.createElement('form');
                addProductForm.innerHTML = `
                    <tr>
                        <td><input type="text" id="nuevo-producto-${docId}" class="form-control"></td>
                        <td><input type="text" id="nueva-presentacion-${docId}" class="form-control"></td>
                        <td><input type="number" id="nueva-cantidad-${docId}" class="form-control"></td>
                        <td><button class="btn btn-primary" onclick="agregarProducto('${docId}')">Agregar Producto</button></td>
                    </tr>
                `;
                productosList.appendChild(addProductForm);
            } catch (error) {
                console.error('Error al revisar pedido realizado:', error);
            }
        }
    }

    window.revisarPedidoRealizado = revisarPedidoRealizado;

    async function actualizarCantidad(docId, producto, cantidad) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos.map(p => {
                if (p.producto === producto) {
                    p.cantidad = cantidad;
                }
                return p;
            });
            await updateDoc(pedidoRef, { productos });
            alert('Cantidad actualizada.');
        } catch (error) {
            console.error('Error al actualizar cantidad:', error);
        }
    }

    window.actualizarCantidad = actualizarCantidad;

    async function eliminarProducto(docId, index) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos;
            productos.splice(index, 1); // Eliminar el producto en la posición indicada
            await updateDoc(pedidoRef, { productos });
            revisarPedidoRealizado(docId); // Actualizar la vista
        } catch (error) {
            console.error('Error al eliminar producto:', error);
        }
    }

    window.eliminarProducto = eliminarProducto;

    async function agregarProducto(docId) {
        const nuevoProducto = document.getElementById(`nuevo-producto-${docId}`).value;
        const nuevaPresentacion = document.getElementById(`nueva-presentacion-${docId}`).value;
        const nuevaCantidad = document.getElementById(`nueva-cantidad-${docId}`).value;

        if (!nuevoProducto || !nuevaPresentacion || !nuevaCantidad) {
            alert('Debe completar todos los campos.');
            return;
        }

        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productoItem = { producto: nuevoProducto, presentacion: nuevaPresentacion, cantidad: nuevaCantidad };
            const productos = pedido.productos;
            productos.push(productoItem);
            await updateDoc(pedidoRef, { productos });
            revisarPedidoRealizado(docId); // Actualizar la vista
        } catch (error) {
            console.error('Error al agregar producto:', error);
        }
    }

    window.agregarProducto = agregarProducto;

    async function confirmarPedido(docId) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            await updateDoc(pedidoRef, { estado: 'confirmado' });
            alert('Pedido confirmado exitosamente.');
            cargarPedidos(); // Actualizar la vista
        } catch (error) {
            console.error('Error al confirmar pedido:', error);
        }
    }

    window.confirmarPedido = confirmarPedido;

    async function verificarProductoEntregado(docId) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            await updateDoc(pedidoRef, { estado: 'completado' });
            alert('Producto verificado y pedido completado.');
            cargarPedidos(); // Actualizar la vista
        } catch (error) {
            console.error('Error al verificar producto entregado:', error);
        }
    }

    window.verificarProductoEntregado = verificarProductoEntregado;

    async function eliminarPedido(docId) {
        if (confirm("¿Está seguro de que desea eliminar este pedido?")) {
            try {
                await deleteDoc(firestoreDoc(db, "pedidos", docId));
                document.getElementById(`pedido-${docId}`).remove();
                alert("Pedido eliminado exitosamente.");
                cargarPedidos();
            } catch (error) {
                console.error("Error al eliminar pedido:", error);
            }
        }
    }

    window.eliminarPedido = eliminarPedido;

    async function exportarPedidoPDF(docId, sucursal, fecha, proveedor) {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
            const pedido = docSnap.data();
            let y = 10;
            pdfDoc.text(`PEDIDO ${pedido.nombre.toUpperCase()}`, 10, y);
            pdfDoc.text(`Fecha: ${pedido.fecha}`, 10, y + 10);
            y += 20;
            pdfDoc.autoTable({
                startY: y,
                head: [['PRODUCTO', 'PRESENTACIÓN', 'CANTIDAD']],
                body: pedido.productos.map(p => [p.producto, p.presentacion, p.cantidad]),
            });
            pdfDoc.save(`pedido_${pedido.nombre.replace(/\s/g, '_')}.pdf`);
        } catch (error) {
            console.error('Error al exportar pedido a PDF:', error);
        }
    }

    window.exportarPedidoPDF = exportarPedidoPDF;

    cargarPedidos();
});
