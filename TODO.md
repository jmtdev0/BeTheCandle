En este archivo, vamos a tratar los diferentes puntos que nos quedan para que la aplicación esté completa. 

# Ajustes y mejoras (Community Pot)

* LA HORA REAL
* Nieve en Navidad y música de Fortnite
* Guardar hora real en la que se ha hecho el reparto
* Si un usuario introduce una dirección de wallet que ya está incluida en el reparto actual, se le debe indicar que ya lo está y no guardarla.
* Debe existir una probabilidad entre 100 de que cuando se muestra una circunferencia de las que aparecen en el fondo tenga color morado y no amarillo.

* Si el botón Create Your Satellite se mueve a la pantalla de Lobby, el menú lateral tiene mucho espacio libre, así que se puede recortar y que solo tenga de alto hasta la mitad de la pantalla o así.

# Ajustes y mejoras II

* Socketear en Community Pot para que cuando se añade un participante, lo vean los demás en tiempo real
* Botón Donate ethereum:CONTRACT_ADDRESS/transfer?address=YOUR_WALLET_ADDRESS&uint256=AMOUNT
* Google will allow iqokybiidqksdrbqeitp.supabase.co to access this info about you (Es de pago el dominio en Supabase)
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

# Opus

1. Falta validación de reCAPTCHA en el servidor para el endpoint /api/community-pot/join
El endpoint /api/community-pot/join/route.ts no valida el reCAPTCHA. Solo /api/community-pot/verify-address lo hace. Alguien podría saltarse la verificación llamando directamente al endpoint de join.

Solución: Mover la lógica de join dentro de verify-address o validar reCAPTCHA también en join.

2. Sin rate limiting en los endpoints
Los endpoints de la API no tienen protección contra spam/abuso. Un atacante podría hacer miles de peticiones por segundo.

Solución: Añadir rate limiting con algo como @upstash/ratelimit o middleware de Netlify.

4. Sin confirmación visual del join exitoso
Cuando el usuario hace join exitosamente, el modal simplemente se cierra. No hay feedback claro de éxito.

Solución: Añadir un toast/notificación de "Successfully joined!" o animación de confirmación.

7. Sin notificaciones al usuario
El usuario no sabe cuándo se ejecutó un reparto o si recibió fondos.

Solución: Integrar email/push notifications o al menos un banner cuando hay un reparto nuevo completado.

9. Conectar wallet automáticamente
Actualmente el usuario tiene que copiar/pegar su dirección manualmente.

Solución: Integrar Web3Modal o RainbowKit para conectar MetaMask directamente.

19. Accesibilidad (a11y)
Faltan algunos aria-label
El contraste de algunos textos grises podría mejorarse
Navegación por teclado no está completamente testada