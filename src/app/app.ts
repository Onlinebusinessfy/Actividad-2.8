
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { Productos, Producto } from './services/productos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  productos: Producto[] = [];

  producto: Producto = {
    title: '',
    price: 0,
    category: ''
  };

  editando = false;
  idEditar: number | null = null;
  mensaje = '';
  error = '';
  cargando = false;

  constructor(
    private servicioProductos: Productos,
    private detector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.obtenerProductos();
  }

  obtenerProductos(): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    this.servicioProductos.obtenerProductos()
      .pipe(
        timeout(10000),
        finalize(() => {
          this.cargando = false;
          this.detector.detectChanges();
        })
      )
      .subscribe({
        next: (datos) => {
          this.productos = datos;
          this.detector.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar productos:', err);

          this.error =
            'No se pudieron cargar los productos. Revisa tu conexión e intenta nuevamente.';

          this.detector.detectChanges();
        }
      });
  }

  guardarProducto(): void {
    this.mensaje = '';
    this.error = '';

    if (
      !this.producto.title.trim() ||
      this.producto.title.trim().length < 3 ||
      !this.producto.category.trim() ||
      !Number.isFinite(Number(this.producto.price)) ||
      Number(this.producto.price) <= 0
    ) {
      this.error =
        'Escribe un nombre de al menos 3 caracteres, una categoría y un precio mayor que cero.';
      return;
    }

    const datos: Producto = {
      title: this.producto.title.trim(),
      price: Number(this.producto.price),
      category: this.producto.category.trim()
    };

    if (this.editando && this.idEditar !== null) {
      const id = this.idEditar;

      this.servicioProductos.editarProducto(id, datos).subscribe({
        next: () => {
          this.productos = this.productos.map(p =>
            p.id === id ? { ...datos, id } : p
          );

          this.mensaje = 'Producto actualizado correctamente.';
          this.limpiarFormulario();
          this.detector.detectChanges();
        },
        error: (err) => {
          console.error('Error al editar:', err);
          this.error = 'No se pudo actualizar el producto.';
          this.detector.detectChanges();
        }
      });
    } else {
      this.servicioProductos.agregarProducto(datos).subscribe({
        next: (respuesta) => {
          const ids = this.productos.map(p => p.id ?? 0);
          const siguienteId = Math.max(0, ...ids) + 1;

          const nuevo: Producto = {
            ...datos,
            id: siguienteId
          };

          this.productos = [...this.productos, nuevo];
          this.mensaje = 'Producto agregado correctamente.';
          this.limpiarFormulario();
          this.detector.detectChanges();
        },
        error: (err) => {
          console.error('Error al agregar:', err);
          this.error = 'No se pudo agregar el producto.';
          this.detector.detectChanges();
        }
      });
    }
  }

  seleccionarProducto(producto: Producto): void {
    console.log('Producto seleccionado:', producto);

    this.producto = {
      title: producto.title,
      price: producto.price,
      category: producto.category
    };

    this.editando = true;
    this.idEditar = producto.id ?? null;
    this.mensaje = '';
    this.error = '';

    this.detector.detectChanges();
  }

  eliminarProducto(id: number | undefined): void {
    if (id === undefined) {
      return;
    }

    if (!confirm('¿Seguro que deseas eliminar este producto?')) {
      return;
    }

    this.mensaje = '';
    this.error = '';

    this.servicioProductos.eliminarProducto(id).subscribe({
      next: () => {
        this.productos = this.productos.filter(p => p.id !== id);
        this.mensaje = 'Producto eliminado correctamente.';

        if (this.idEditar === id) {
          this.limpiarFormulario();
        }

        this.detector.detectChanges();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.error = 'No se pudo eliminar el producto.';
        this.detector.detectChanges();
      }
    });
  }

  limpiarFormulario(): void {
    this.producto = {
      title: '',
      price: 0,
      category: ''
    };

    this.editando = false;
    this.idEditar = null;
  }
}
