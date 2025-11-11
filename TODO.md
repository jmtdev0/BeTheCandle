En este archivo, vamos a tratar los diferentes puntos que nos quedan para que la aplicación esté completa. 

# Puntos principales

* Nueva sección Community Pot. En esta sección, diariamente se recaudará un bote comunitario de BTC que se guardará en una dirección de memoria que yo custodiaré; aunque esto de custodiarlo quiero evitarlo a toda costa (¿sería posible alguna alternativa mediante Lightning Network?). A cierta hora del día, el bote se repartirá equitativamente entre todos los participantes, que habrán indicado la dirección de memoria en la que lo quieren recibir. Esto supondrá muchas transacciones, o una transacción masiva, lo que sea para evitar un exceso de comisiones. La representación visual de esta sección será también una escena espacial, como Goofy Mode, pero, en este caso, se podrá observar una nebulosa a la que se irán introduciendo los usuarios, representados con bolitas luminosas, quizá, y que irá creciendo conforme el bote aumente.
* Añadir más información a las tarjetas de información de los usuarios: un nombre preferido, enlaces a redes sociales
* En el Lobby, añadir un ránking de donantes: aquellos que más BTC han donado.

# Ajustes y mejoras

* Al darle a Create your satellite, se abre directamente el login con Google
* Google will allow iqokybiidqksdrbqeitp.supabase.co to access this info about you
* ✅ El usuario puede configurar también la velocidad a la que orbita su satélite mediante de un slider.
* ✅ Las órbitas de los satélites (ya visibles con anillos)
* ✅ Al cerrar la tarjeta de información de un satélite, la cámara debe volver a poner el foco en la estrella Bitcoin.
* ✅ Cuando termina una canción, debe sonar otra aleatoriamente, pero no la que acaba de terminar.
* ✅ Favicon: Quitar fondo negro de la imagen, que no tenga fondo.
* Que no esté bloqueado el giro de la cámara cuando ves un satélite.

# Ajustes y mejoras II

* Responsive total. Adaptación a móvil
* Ampliar el área de hover ralentizador del ratón. Estaría bien incluso que el usuario arrojara algo de luz sobre la escena cuando me mueve su ratón a un punto concreto de ella

# Pijotadas

* Que el favicon cambie continuamente. Que sea como un GIF de una estrella que flota y se mueve suavemente de arriba a abajo.


# Comentarios

* Recuerda que tenemos disponible una base de datos PostgresSQL que está alojada en Supabase. La parte backend necesaria en principio creo que la vamos a desarrollar en Supabase Edge Functions. ¿Cómo lo ves?
* No acumular todo el código en los mismos archivos. Crear carpetas separadas para las secciones Lobby (que ahora se llama Goofy Mode) y Community Pot.

---

