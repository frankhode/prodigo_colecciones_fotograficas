# Pródigo — Colecciones fotográficas

Galería fotográfica estática para GitHub Pages. No requiere backend, base de datos ni compilación.

## Publicación

Subir **el contenido de esta carpeta** a la raíz del repositorio `frankhode/prodigo_bixio`, conservando `assets/full` y `assets/thumbs`. En Settings → Pages, seleccionar **Deploy from a branch**, rama `main`, carpeta `/(root)`.

Sitio esperado: https://frankhode.github.io/prodigo_bixio/

## Archivo documental

`data.json` almacena las fotografías visibles, etiquetas, marcas, asociación con reversos y fechas simuladas. Las etiquetas son experimentales, editables y no representan una catalogación rigurosa. 1899–1930 es una cronología demostrativa derivada del orden de escaneo. Los reversos se asocian provisoriamente por secuencia y deben cotejarse individualmente.

El archivo `img102` se excluye al ser una digitalización de mayor resolución del mismo objeto que `img103`. Reversos aparecen en el visor, no en el mosaico.

## Desarrollo

Para probar localmente ejecutar `python -m http.server 8000` dentro de esta carpeta y abrir `http://localhost:8000`.

## Varias colecciones

La portada reúne todas las colecciones del registro `data/index.json` del repositorio de datos `frankhode/prodigo-catalogador`. El selector permite ver una sola. Los enlaces `?coleccion=<id>` abren una colección específica; `?demo=1` conserva la muestra histórica de Bixio. El catalogador permite crear colecciones independientes, cada una con sus fichas, firmas e imágenes.

El código usa rutas relativas, por lo que admite renombrar este repositorio a `prodigo_colecciones_fotograficas`. El repositorio de datos no debe renombrarse: es independiente del nombre público del sitio. Tras renombrar, las direcciones serán `https://frankhode.github.io/prodigo_colecciones_fotograficas/` y su subcarpeta `catalogador/`. GitHub Pages no redirige automáticamente la dirección antigua.
