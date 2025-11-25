En este archivo, vamos a tratar los diferentes puntos que nos quedan para que la aplicación esté completa. 

# Ajustes y mejoras (Community Pot)

* Al pulsar en las pestañas Last o Current del panel de información, actualizar la información que se muestra.
* Si no hay ningún participante en el reparto, colocar el botón Reserve your slot en el centro de la pantalla (y que esté visible todo el tiempo).
* Mostrar un par de decimales más en las cifras de los ránkings, si es posible
* Si se accede a la web por una URL genérica (http://localhost:3000/), quiero que se redirija a /community-pot; no al Lobby.
* No se debe permitir añadir un participante más al reparto si ya se ha alcanzado el máximo de participantes permitido (el número de registros que tenga asociados el reparto en la tabla community_pot_payout_participants)
* En el menú lateral de la aplicación, desde el que se puede navegar a Lobby y Community Pot, se puede ver cuántos usuarios hay Online en la pestaña de Lobby. Quiero que ese indicador se muestre también cuando el usuario está en Community Pot.
* Al cargar la página, el zoom por defecto será el máximo zoom out que tiene ahora mismo permitido el usuario, para poder observar mejor todas las bolas.
* Si un usuario introduce una dirección de wallet que ya está incluida en el reparto actual, se le debe indicar que ya lo está y no guardarla.
* En el div de inserción de dirección de wallet, se debe advertir al usuario de que su dirección no estará oculta para el resto de usuarios.
* Debe existir una probabilidad entre 100 de que cuando se muestra una circunferencia de las que aparecen en el fondo tenga color morado y no amarillo.
* El botón Create Your Satellite (que después pasa a ser el botón con el que el usuario accede a su perfil si está logeado con Google) quiero sacarlo del menú lateral y colocarlo en Lobby, situado en la parte inferior de la pantalla, en el centro.
* Si el botón Create Your Satellite se mueve a la pantalla de Lobby, el menú lateral tiene mucho espacio libre, así que se puede recortar y que solo tenga de alto hasta la mitad de la pantalla o así.

# Ajustes y mejoras II

* Socketear en Community Pot para que cuando se añade un participante, lo vean los demás en tiempo real
* Botón Donate ethereum:CONTRACT_ADDRESS/transfer?address=YOUR_WALLET_ADDRESS&uint256=AMOUNT
* Google will allow iqokybiidqksdrbqeitp.supabase.co to access this info about you
* Al cerrar la tarjeta de información de un satélite, la cámara debe volver a poner el foco en la estrella Bitcoin.
* Que no esté bloqueado el giro de la cámara cuando ves un satélite. Que con el scroll puedas salir de la vista.
* Explicar el lore
* LORE
* Avisar a los participantes de que se ha hecho el reparto (por correo o algo)
* Guardar la fecha real a la que se ha hecho el reparto
* Al terminar una canción, se debe pasar a otra distinta aleatoria.
* Logout. Ocultar el planeta YOU.
* Responsive total. Adaptación a móvil
* Ampliar el área de hover ralentizador del ratón. Estaría bien incluso que el usuario arrojara algo de luz sobre la escena cuando me mueve su ratón a un punto concreto de ella

# Test

* ¿Qué pasa cuando se llega al máximo de participantes?

# Pijotadas

* El primero se lleva un dólar extra

* Mostrar todas las opciones de la interfaz si el usuario está empanado

# Comentarios

* Recuerda que tenemos disponible una base de datos PostgresSQL que está alojada en Supabase. La parte backend necesaria en principio creo que la vamos a desarrollar en Supabase Edge Functions. ¿Cómo lo ves?
* No acumular todo el código en los mismos archivos. Crear carpetas separadas para las secciones Lobby (que ahora se llama Goofy Mode) y Community Pot.

---

