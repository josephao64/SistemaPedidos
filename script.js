import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, arrayUnion, doc as firestoreDoc, increment, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
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

    function toggleFondoInput() {
        const fondoInput = document.getElementById('fondo_pedido');
        const ingresarDespues = document.getElementById('ingresarFondoDespues').checked;
        if (ingresarDespues) {
            fondoInput.disabled = true;
            fondoInput.removeAttribute('required');
        } else {
            fondoInput.disabled = false;
            fondoInput.setAttribute('required', 'required');
        }
    }

    window.toggleFondoInput = toggleFondoInput;

    async function registrarPedido(event) {
        event.preventDefault();

        const nombrePedido = document.getElementById('nombre_pedido').value;
        const fechaPedido = document.getElementById('fecha_pedido').value;
        const fondoPedido = parseFloat(document.getElementById('fondo_pedido').value) || 0;

        const nuevoPedido = { nombre: nombrePedido, fecha: fechaPedido, fondo: fondoPedido, facturas: [], productos: [] };
        
        try {
            await addDoc(collection(db, "pedidos"), nuevoPedido);
            document.getElementById('pedido-form').reset();
            alert('Pedido registrado exitosamente.');
            cargarPedidos();
            cargarPedidosSelect(); // Actualizar la lista de pedidos en el formulario de ingreso de facturas
            cargarPedidosReporteSelect(); // Actualizar la lista de pedidos en el formulario de generación de reportes
            cargarPedidosProductoSelect(); // Actualizar la lista de pedidos en el formulario de ingreso de productos
            cargarPedidosFondoSelect(); // Actualizar la lista de pedidos en el formulario de agregar fondo
        } catch (error) {
            console.error('Error al registrar pedido:', error);
        }
    }

    window.registrarPedido = registrarPedido;

    async function registrarFactura(event) {
        event.preventDefault();

        const pedidoId = document.getElementById('pedido').value;
        const sucursal = document.getElementById('sucursal').value;
        const fecha = document.getElementById('fecha').value;
        const nroFactura = document.getElementById('nro_factura').value;
        const descripcion = document.getElementById('descripcion').value;
        const monto = parseFloat(document.getElementById('monto').value);
        const boleta = document.getElementById('boleta').files[0];
        const fotoFactura = document.getElementById('foto_factura').files[0];
        const comentarios = document.getElementById('comentarios').value;

        if (!pedidoId) {
            alert('Debe seleccionar un pedido.');
            return;
        }   

        const reader = new FileReader();
        reader.onload = async function(e) {
            const pedidoRef = firestoreDoc(db, "pedidos", pedidoId);
            const factura = { sucursal, fecha, nroFactura, descripcion, monto, fotoFactura: e.target.result, comentarios };

            try {
                await updateDoc(pedidoRef, {
                    facturas: arrayUnion(factura),
                    fondo: increment(-monto)
                });
                document.getElementById('factura-form').reset();
                alert('Factura registrada exitosamente.');
                mostrarFacturas(pedidoId);
            } catch (error) {
                console.error('Error al registrar factura:', error);
            }
        };
        reader.readAsDataURL(fotoFactura);
    }

    window.registrarFactura = registrarFactura;

    async function agregarProducto(event) {
        event.preventDefault();

        const pedidoId = document.getElementById('pedido_producto').value;
        const sucursal = document.getElementById('sucursal_producto').value;
        const producto = document.getElementById('producto').value;
        const presentacion = document.getElementById('presentacion').value;
        const cantidad = parseInt(document.getElementById('cantidad').value, 10);

        if (!pedidoId) {
            alert('Debe seleccionar un pedido.');
            return;
        }

        const pedidoRef = firestoreDoc(db, "pedidos", pedidoId);
        const productoItem = { sucursal, producto, presentacion, cantidad };

        try {
            await updateDoc(pedidoRef, {
                productos: arrayUnion(productoItem)
            });
            document.getElementById('producto-form').reset();
            alert('Producto agregado exitosamente.');
            mostrarProductosPorSucursal(pedidoId);
        } catch (error) {
            console.error('Error al agregar producto:', error);
        }
    }

    window.agregarProducto = agregarProducto;

    async function agregarFondo(event) {
        event.preventDefault();

        const pedidoId = document.getElementById('pedido_fondo').value;
        const nuevoFondo = parseFloat(document.getElementById('nuevo_fondo').value);

        if (!pedidoId) {
            alert('Debe seleccionar un pedido.');
            return;
        }

        const pedidoRef = firestoreDoc(db, "pedidos", pedidoId);

        try {
            await updateDoc(pedidoRef, {
                fondo: increment(nuevoFondo)
            });
            document.getElementById('fondo-form').reset();
            alert('Fondo agregado exitosamente.');
            cargarPedidos();
        } catch (error) {
            console.error('Error al agregar fondo:', error);
        }
    }

    window.agregarFondo = agregarFondo;

    async function cargarPedidos() {
        const pedidosList = document.getElementById('pedidos-list');
        pedidosList.innerHTML = '';

        try {
            const snapshot = await getDocs(collection(db, "pedidos"));
            snapshot.forEach((doc, index) => {
                const pedido = doc.data();
                const pedidoElement = document.createElement('div');
                pedidoElement.classList.add('pedido');
                pedidoElement.id = `pedido-${doc.id}`;
                pedidoElement.innerHTML = `
                    <h3>Pedido: ${pedido.nombre} - ${pedido.fecha}</h3>
                    <p>Fondo: Q<span class="${pedido.fondo < 0 ? 'negative' : ''}">${pedido.fondo.toFixed(2)}</span></p>
                    <button class="btn btn-primary" onclick="mostrarFacturas('${doc.id}', ${index})">Mostrar Facturas</button>
                    <div id="facturas-${index}" class="facturas hidden"></div>
                    <button class="btn btn-primary" onclick="mostrarProductosPorSucursal('${doc.id}')">Mostrar Pedido</button>
                    <button class="btn btn-danger" onclick="eliminarPedido('${doc.id}')">Eliminar Pedido</button>
                    <button class="btn btn-secondary" onclick="showAgregarFondo('${doc.id}')">Agregar Fondo</button>
                `;

                pedidosList.appendChild(pedidoElement);
            });
        } catch (error) {
            console.error('Error al cargar pedidos:', error);
        }
    }

    window.cargarPedidos = cargarPedidos;

    async function mostrarFacturas(docId, index) {
        const facturasDiv = document.getElementById(`facturas-${index}`);
        facturasDiv.classList.toggle('hidden');

        if (!facturasDiv.classList.contains('hidden')) {
            try {
                const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
                const pedido = docSnap.data();
                facturasDiv.innerHTML = '';

                const facturasPorSucursal = pedido.facturas.reduce((acc, factura) => {
                    if (!acc[factura.sucursal]) acc[factura.sucursal] = [];
                    acc[factura.sucursal].push(factura);
                    return acc;
                }, {});

                for (const sucursal in facturasPorSucursal) {
                    const sucursalElement = document.createElement('div');
                    sucursalElement.classList.add('sucursal');
                    sucursalElement.innerHTML = `<h4>Sucursal: ${sucursal}</h4>`;
                    
                    const facturasTable = document.createElement('table');
                    facturasTable.classList.add('table', 'table-bordered');
                    facturasTable.innerHTML = `
                        <thead>
                            <tr>
                                <th>FECHA</th>
                                <th>NÚMERO DE FACTURA</th>
                                <th>DESCRIPCIÓN</th>
                                <th>MONTO</th>
                                <th>PAGADA</th>
                                <th>BOLETA DE PAGO</th>
                            </tr>
                        </thead>
                        <tbody>
                        ${facturasPorSucursal[sucursal].map((factura, index) => `
                            <tr>
                                <td>${factura.fecha}</td>
                                <td>${factura.nroFactura}</td>
                                <td>${factura.descripcion}</td>
                                <td>Q${factura.monto.toFixed(2)}</td>
                                <td><input type="checkbox" ${factura.pagada ? 'checked' : ''} onclick="marcarPagada('${docId}', '${sucursal}', ${index}, this.checked)"></td>
                                <td>
                                    <div class="drop-area" id="drop-area-boleta-${index}">
                                        Arrastra y suelta la boleta aquí o <input type="file" id="boleta-${index}" class="form-control-file" accept="application/pdf" onchange="subirBoleta('${docId}', '${sucursal}', ${index}, this.files[0])">
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                        </tbody>
                    `;
                    sucursalElement.appendChild(facturasTable);
                    facturasDiv.appendChild(sucursalElement);
                }
            } catch (error) {
                console.error('Error al mostrar facturas:', error);
            }
        }
    }

    window.mostrarFacturas = mostrarFacturas;

    async function mostrarProductosPorSucursal(docId) {
        const productosList = document.getElementById('productos-list');
        productosList.innerHTML = '';

        showMenu('pedidos');  // Cambiar a la vista de ingresar productos

        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", docId));
            const pedido = docSnap.data();
            const productosPorSucursal = pedido.productos.reduce((acc, producto) => {
                if (!acc[producto.sucursal]) acc[producto.sucursal] = [];
                acc[producto.sucursal].push(producto);
                return acc;
            }, {});

            for (const sucursal in productosPorSucursal) {
                const sucursalElement = document.createElement('div');
                sucursalElement.classList.add('sucursal');
                sucursalElement.innerHTML = `<h4>Sucursal: ${sucursal}</h4>`;
                
                const productosTable = document.createElement('table');
                productosTable.classList.add('table', 'table-bordered');
                productosTable.innerHTML = `
                    <thead>
                        <tr>
                            <th>PRODUCTO</th>
                            <th>PRESENTACIÓN</th>
                            <th>PEDIDO</th>
                            <th>RECIBIDO</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                    ${productosPorSucursal[sucursal].map((producto, index) => `
                        <tr>
                            <td>${producto.producto}</td>
                            <td>${producto.presentacion}</td>
                            <td>${producto.cantidad}</td>
                            <td><input type="checkbox" ${producto.recibido ? 'checked' : ''} onclick="marcarRecibido('${docId}', '${sucursal}', ${index}, this.checked)"></td>
                            <td><button class="btn btn-danger" onclick="eliminarProducto('${docId}', '${sucursal}', ${index})">Eliminar</button></td>
                        </tr>
                    `).join('')}
                    </tbody>
                `;
                sucursalElement.appendChild(productosTable);
                sucursalElement.innerHTML += `<button class="btn btn-primary mt-2" onclick="exportarSucursalPDF('${docId}', '${sucursal}')">Exportar Sucursal a PDF</button>`;
                productosList.appendChild(sucursalElement);
            }
        } catch (error) {
            console.error('Error al mostrar productos por sucursal:', error);
        }
    }

    window.mostrarProductosPorSucursal = mostrarProductosPorSucursal;

    async function eliminarProducto(docId, sucursal, index) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos;
            productos.splice(index, 1); // Eliminar el producto en la posición indicada
            await updateDoc(pedidoRef, { productos });
            mostrarProductosPorSucursal(docId); // Actualizar la vista
        } catch (error) {
            console.error('Error al eliminar producto:', error);
        }
    }

    window.eliminarProducto = eliminarProducto;

    async function marcarRecibido(docId, sucursal, index, recibido) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const productos = pedido.productos;
            productos[index].recibido = recibido; // Marcar como recibido el producto en la posición indicada
            await updateDoc(pedidoRef, { productos });
            mostrarProductosPorSucursal(docId); // Actualizar la vista
        } catch (error) {
            console.error('Error al marcar producto como recibido:', error);
        }
    }

    window.marcarRecibido = marcarRecibido;

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

    async function cargarPedidosSelect() {
        const pedidoSelect = document.getElementById('pedido');
        pedidoSelect.innerHTML = ''; // Limpiar las opciones existentes

        try {
            const snapshot = await getDocs(collection(db, "pedidos"));
            snapshot.forEach(doc => {
                const pedido = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${pedido.nombre} - ${pedido.fecha}`;
                pedidoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar pedidos en select:', error);
        }
    }

    async function cargarPedidosProductoSelect() {
        const pedidoProductoSelect = document.getElementById('pedido_producto');
        pedidoProductoSelect.innerHTML = ''; // Limpiar las opciones existentes

        try {
            const snapshot = await getDocs(collection(db, "pedidos"));
            snapshot.forEach(doc => {
                const pedido = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${pedido.nombre} - ${pedido.fecha}`;
                pedidoProductoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar pedidos en select:', error);
        }
    }

    async function cargarPedidosFondoSelect() {
        const pedidoFondoSelect = document.getElementById('pedido_fondo');
        pedidoFondoSelect.innerHTML = ''; // Limpiar las opciones existentes

        try {
            const snapshot = await getDocs(collection(db, "pedidos"));
            snapshot.forEach(doc => {
                const pedido = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${pedido.nombre} - ${pedido.fecha}`;
                pedidoFondoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar pedidos en select:', error);
        }
    }

    async function cargarPedidosReporteSelect() {
        const pedidoReporteSelect = document.getElementById('pedido-reporte');
        pedidoReporteSelect.innerHTML = ''; // Limpiar las opciones existentes

        try {
            const snapshot = await getDocs(collection(db, "pedidos"));
            snapshot.forEach(doc => {
                const pedido = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${pedido.nombre} - ${pedido.fecha}`;
                pedidoReporteSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar pedidos en select:', error);
        }
    }

    async function generarReporte() {
        const tipoReporte = document.getElementById('reporte-select').value;
        const pedidoId = document.getElementById('pedido-reporte').value;

        if (!pedidoId) {
            alert('Debe seleccionar un pedido.');
            return;
        }

        if (tipoReporte === 'reporte_pedidos') {
            generarReportePedidos();
        } else if (tipoReporte === 'reporte_facturas') {
            generarReporteFacturas(pedidoId);
        } else if (tipoReporte === 'reporte_facturas_con_imagenes') {
            generarReporteFacturasConImagenes(pedidoId);
        }
    }

    window.generarReporte = generarReporte;

    async function generarReportePedidos() {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        try {
            const snapshot = await getDocs(collection(db, "pedidos"));
            let y = 10;
            snapshot.forEach(docSnap => {
                const pedido = docSnap.data();
                pdfDoc.text(`Pedido: ${pedido.nombre} - ${pedido.fecha}`, 10, y);
                pdfDoc.text(`Fondo: Q${pedido.fondo.toFixed(2)}`, 10, y + 10);
                y += 20;
            });
            pdfDoc.save('reporte_pedidos.pdf');
        } catch (error) {
            console.error('Error al generar reporte de pedidos:', error);
        }
    }

    async function generarReporteFacturas(pedidoId) {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", pedidoId));
            const pedido = docSnap.data();
            let y = 10;
            pdfDoc.text(`Pedido: ${pedido.nombre} - ${pedido.fecha}`, 10, y);
            y += 10;
            pedido.facturas.forEach(factura => {
                pdfDoc.text(`Sucursal: ${factura.sucursal}`, 10, y);
                pdfDoc.text(`Fecha: ${factura.fecha}`, 10, y + 10);
                pdfDoc.text(`Número de Factura: ${factura.nroFactura}`, 10, y + 20);
                pdfDoc.text(`Descripción: ${factura.descripcion}`, 10, y + 30);
                pdfDoc.text(`Monto: Q${factura.monto.toFixed(2)}`, 10, y + 40);
                y += 50;
            });
            pdfDoc.save('reporte_facturas.pdf');
        } catch (error) {
            console.error('Error al generar reporte de facturas:', error);
        }
    }

    async function generarReporteFacturasConImagenes(pedidoId) {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", pedidoId));
            const pedido = docSnap.data();
            let y = 10;
            pdfDoc.text(`Pedido: ${pedido.nombre} - ${pedido.fecha}`, 10, y);
            y += 10;
            pedido.facturas.forEach(factura => {
                pdfDoc.text(`Sucursal: ${factura.sucursal}`, 10, y);
                pdfDoc.text(`Fecha: ${factura.fecha}`, 10, y + 10);
                pdfDoc.text(`Número de Factura: ${factura.nroFactura}`, 10, y + 20);
                pdfDoc.text(`Descripción: ${factura.descripcion}`, 10, y + 30);
                pdfDoc.text(`Monto: Q${factura.monto.toFixed(2)}`, 10, y + 40);
                y += 50;

                const img = new Image();
                img.src = factura.fotoFactura;
                pdfDoc.addImage(img, 'JPEG', 10, y, 50, 50);
                y += 60;

                if (y > 270) { // Adjust this value as necessary to avoid overlapping
                    pdfDoc.addPage();
                    y = 10;
                }
            });
            pdfDoc.save('reporte_facturas_con_imagenes.pdf');
        } catch (error) {
            console.error('Error al generar reporte de facturas con imágenes:', error);
        }
    }

    async function exportarPedidoPDF() {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();
        const pedidoId = document.getElementById('pedido_producto').value;

        if (!pedidoId) {
            alert('Debe seleccionar un pedido.');
            return;
        }

        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", pedidoId));
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

    async function exportarSucursalPDF(pedidoId, sucursal) {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        try {
            const docSnap = await getDoc(firestoreDoc(db, "pedidos", pedidoId));
            const pedido = docSnap.data();
            const productosPorSucursal = pedido.productos.filter(producto => producto.sucursal === sucursal);
            
            let y = 10;
            pdfDoc.text(`PEDIDO ${pedido.nombre.toUpperCase()}`, 10, y);
            pdfDoc.text(`Fecha: ${pedido.fecha}`, 10, y + 10);
            pdfDoc.text(`Sucursal: ${sucursal.toUpperCase()}`, 10, y + 20);
            y += 30;
            pdfDoc.autoTable({
                startY: y,
                head: [['PRODUCTO', 'PRESENTACIÓN', 'CANTIDAD']],
                body: productosPorSucursal.map(p => [p.producto, p.presentacion, p.cantidad]),
            });
            pdfDoc.save(`pedido_${pedido.nombre.replace(/\s/g, '_')}_${sucursal}.pdf`);
        } catch (error) {
            console.error('Error al exportar pedido a PDF:', error);
        }
    }

    window.exportarSucursalPDF = exportarSucursalPDF;

    async function marcarPagada(docId, sucursal, index, pagada) {
        const pedidoRef = firestoreDoc(db, "pedidos", docId);

        try {
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const facturas = pedido.facturas;
            facturas[index].pagada = pagada; // Marcar como pagada la factura en la posición indicada
            await updateDoc(pedidoRef, { facturas });
            mostrarFacturas(docId); // Actualizar la vista
        } catch (error) {
            console.error('Error al marcar factura como pagada:', error);
        }
    }

    window.marcarPagada = marcarPagada;

    async function subirBoleta(docId, sucursal, index, file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const pedidoRef = firestoreDoc(db, "pedidos", docId);
            const docSnap = await getDoc(pedidoRef);
            const pedido = docSnap.data();
            const facturas = pedido.facturas;
            facturas[index].boleta = e.target.result; // Subir la boleta de pago
            try {
                await updateDoc(pedidoRef, { facturas });
                alert('Boleta de pago subida exitosamente.');
                mostrarFacturas(docId); // Actualizar la vista
            } catch (error) {
                console.error('Error al subir boleta de pago:', error);
            }
        };
        reader.readAsDataURL(file);
    }

    window.subirBoleta = subirBoleta;

    async function showAgregarFondo(docId) {
        document.getElementById('pedido_fondo').value = docId;
        showMenu('fondo');
    }

    window.showAgregarFondo = showAgregarFondo;

    cargarPedidos();
    cargarPedidosSelect(); // Llamar a esta función al cargar la página para llenar el select inicialmente
    cargarPedidosReporteSelect(); // Llamar a esta función al cargar la página para llenar el select del reporte
    cargarPedidosProductoSelect(); // Llamar a esta función al cargar la página para llenar el select de productos
    cargarPedidosFondoSelect(); // Llamar a esta función al cargar la página para llenar el select de fondos

    // Drag and Drop functionality for boleta
    document.querySelectorAll('.drop-area').forEach(dropArea => {
        dropArea.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropArea.classList.add('dragover');
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('dragover');
        });

        dropArea.addEventListener('drop', (event) => {
            event.preventDefault();
            dropArea.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files.length) {
                const input = dropArea.querySelector('input[type="file"]');
                input.files = files;
            }
        });
    });
});
