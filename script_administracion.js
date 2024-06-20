import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, updateDoc, doc as firestoreDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

        let q;
        if (filtroSucursal === 'general') {
            q = collection(db, "pedidos");
        } else {
            q = collection(db, "pedidos").where("sucursal", "==", filtroSucursal);
        }

        onSnapshot(q, (snapshot) => {
            pedidosPendientes.innerHTML = '';
            pedidosConfirmados.innerHTML = '';
            pedidosCompletados.innerHTML = '';

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
                        <button class="btn btn-primary" onclick="mostrarProductosConfirmados('${doc.id}')">Mostrar Pedido</button>
                        <button class="btn btn-danger" onclick="eliminarPedido('${doc.id}')">Eliminar Pedido</button>
                        <button class="btn btn-success" onclick="exportarPedidoPDF('${doc.id}', '${pedido.sucursal}', '${pedido.fecha}', '${pedido.proveedor}')">Exportar a PDF</button>
                        ${pedido.estado === 'pendiente_confirmacion' ? '<button class="btn btn-primary mt-2" onclick="confirmarPedido(\'' + doc.id + '\')">Confirmar Pedido</button>' : ''}
                        ${pedido.estado === 'confirmado' ? '<button class="btn btn-secondary mt-2" onclick="comprobarPedidoRecibidoAdmin(\'' + doc.id + '\')">Comprobar Pedido Recibido</button>' : ''}
                        ${pedido.estado === 'verificado' ? '<button class="btn btn-secondary mt-2" onclick="comprobarPedidoRecibidoAdmin(\'' + doc.id + '\')">Verificar Pedido Recibido</button><button class="btn btn-success mt-2" onclick="descargarPedidoRecibido(\'' + doc.id + '\')">Descargar Pedido Recibido</button>' : ''}
                        ${pedido.estado !== 'completado' ? '<button class="btn btn-secondary mt-2" onclick="marcarPedidoCompletado(\'' + doc.id + '\')">Marcar como Completado</button>' : ''}
                    </div>
                    <div id="productos-${doc.id}" class="card-body hidden">
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
                        ${pedido.estado === 'pendiente_confirmacion' ? '<button class="btn btn-primary mt-2" onclick="confirmarPedido(\'' + doc.id + '\')">Confirmar Pedido</button>' : ''}
                    </div>
                `;
                if (pedido.estado === 'pendiente_confirmacion') {
                    pedidosPendientes.appendChild(pedidoElement);
                } else if (pedido.estado === 'confirmado') {
                    pedidosConfirmados.appendChild(pedidoElement);
                } else if (pedido.estado === 'completado' || pedido.estado === 'verificado') {
                    pedidosCompletados.appendChild(pedidoElement);
                }
            });
        });
    }

    window.cargarPedidos = cargarPedidos;

    async function mostrarProductosConfirmados(docId) {
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
                        <td><input type="number" value="${producto.cantidad}" onchange="actualizarCantidad('${docId}', '${index}', this.value)"></td>
                        <td>${producto.cantidadRecibida || ''}</td>
                        <td>${producto.comentarios || ''}</td>
                    `;
                    productosList.appendChild(productoElement);
                });
            } catch (error) {
                console.error('Error al mostrar productos confirmados:', error);
            }
        }
    }

    window.mostrarProductosConfirmados = mostrarProductosConfirmados;

    async function actualizarCantidad(docId, index, cantidad) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos.map((p, i) => {
                if (i === index) {
                    p.cantidad = cantidad;
                }
                return p;
            });
            await updateDoc(pedidoRef, { productos });
        } catch (error) {
            console.error('Error al actualizar cantidad:', error);
        }
    }

    window.actualizarCantidad = actualizarCantidad;

    async function confirmarPedido(docId) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            await updateDoc(pedidoRef, { estado: 'confirmado' });
            alert('Pedido confirmado exitosamente.');
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
        } catch (error) {
            console.error('Error al verificar producto entregado:', error);
        }
    }

    window.verificarProductoEntregado = verificarProductoEntregado;

    async function eliminarPedido(docId) {
        if (confirm("¿Está seguro de que desea eliminar este pedido?")) {
            try {
                await deleteDoc(firestoreDoc(db, "pedidos", docId));
                alert("Pedido eliminado exitosamente.");
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
            pdfDoc.text(`PEDIDO ${pedido.sucursal.toUpperCase()}`, 10, y);
            pdfDoc.text(`Fecha: ${pedido.fecha}`, 10, y + 10);
            y += 20;
            pdfDoc.autoTable({
                startY: y,
                head: [['PRODUCTO', 'PRESENTACIÓN', 'CANTIDAD']],
                body: pedido.productos.map(p => [p.producto, p.presentacion, p.cantidad]),
            });
            pdfDoc.save(`pedido_${docId}.pdf`);
        } catch (error) {
            console.error('Error al exportar pedido a PDF:', error);
        }
    }

    window.exportarPedidoPDF = exportarPedidoPDF;

    async function comprobarPedidoRecibidoAdmin(docId) {
        const productosList = document.getElementById(`productos-list-${docId}`);
        const productosDiv = document.getElementById(`productos-${docId}`);
        productosDiv.classList.remove('hidden');

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
            console.error('Error al comprobar pedido recibido:', error);
        }
    }

    window.comprobarPedidoRecibidoAdmin = comprobarPedidoRecibidoAdmin;

    async function marcarPedidoCompletado(docId) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            await updateDoc(pedidoRef, { estado: 'completado' });
            alert('Pedido marcado como completado.');
        } catch (error) {
            console.error('Error al marcar pedido como completado:', error);
        }
    }

    window.marcarPedidoCompletado = marcarPedidoCompletado;

    async function descargarPedidoRecibido(docId) {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
            const pedido = docSnap.data();
            let y = 10;
            pdfDoc.text(`PEDIDO RECIBIDO ${pedido.sucursal.toUpperCase()}`, 10, y);
            pdfDoc.text(`Fecha: ${pedido.fecha}`, 10, y + 10);
            y += 20;
            pdfDoc.autoTable({
                startY: y,
                head: [['PRODUCTO', 'PRESENTACIÓN', 'CANTIDAD', 'CANTIDAD RECIBIDA', 'COMENTARIOS']],
                body: pedido.productos.map(p => [p.producto, p.presentacion, p.cantidad, p.cantidadRecibida || 'N/A', p.comentarios || '']),
            });
            pdfDoc.save(`pedido_recibido_${docId}.pdf`);
        } catch (error) {
            console.error('Error al descargar pedido recibido:', error);
        }
    }

    window.descargarPedidoRecibido = descargarPedidoRecibido;

    cargarPedidos();
});