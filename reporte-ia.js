// Variables globales para destruir gráficas previas si se vuelve a consultar
let pieChart, barChart, doughnutChart;

$(document).ready(function () {
  $('#boton_Generar').click(function () {
    // Interfaz de carga
    $(this).prop('disabled', true);
    $('#informe_ia').fadeOut();
    $('#cargando_datos').fadeIn();

    // Consumir API real de productos
    $.ajax({
      url: 'https://fakestoreapi.com/products',
      method: 'GET',
      success: async function (data) {
        await procesarDatos(data);
        $('#cargando_datos').hide();
        $('#informe_ia').fadeIn();
        $('#boton_Generar').prop('disabled', false);
      },
      error: function () {
        alert('Error al conectar con la API de origen.');
        $('#cargando_datos').hide();
        $('#boton_Generar').prop('disabled', false);
      }
    });
  });
});

async function procesarDatos(data) {
  // Estructura para agrupar información
  let categorias = {};

  data.forEach(item => {
    if (!categorias[item.category]) {
      categorias[item.category] = { count: 0, totalPrice: 0, totalRatings: 0 };
    }
    categorias[item.category].count += 1;
    categorias[item.category].totalPrice += item.price;
    categorias[item.category].totalRatings += item.rating.count;
  });

  // Preparar arreglos para Chart.js
  let labels = Object.keys(categorias);
  let productCounts = labels.map(l => categorias[l].count);
  let avgPrices = labels.map(l => (categorias[l].totalPrice / categorias[l].count).toFixed(2));
  let interactions = labels.map(l => categorias[l].totalRatings);

  // Colores bonitos para las gráficas
  let bgColors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0'];

  // 1. Gráfica Pie (Distribución de productos)
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('chartPie'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{ data: productCounts, backgroundColor: bgColors }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 2. Gráfica Barras (Precios Promedio)
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('chartBar'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Precio Promedio USD ($)',
        data: avgPrices,
        backgroundColor: '#36a2eb'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 3. Gráfica Doughnut (Ratings / Interacciones)
  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(document.getElementById('chartDoughnut'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{ data: interactions, backgroundColor: bgColors }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 4. Generar análisis real con IA
  await generarResultadoIA(labels, avgPrices, interactions, data.length);
}

async function generarResultadoIA(labels, avgPrices, interactions, totalProducts) {
  const apikey = API_KEY;
  // Mostrar estado de carga en el panel de IA
  $('#respuesta_ia').html('<em>Generando análisis con inteligencia artificial...</em>');

  // Construir lista de datos por categoría para el prompt
  const dataList = labels.map((label, i) =>
    `- ${label}: precio promedio $${avgPrices[i]}, valoraciones de usuarios: ${interactions[i]}`
  ).join('\n');

  const prompt = `
    Eres un analista profesional de comercio electrónico e inteligencia de negocios.

    IMPORTANTE:
    - Responde únicamente con análisis relacionado a los datos proporcionados.
    - No inventes información que no esté en los datos.
    - Usa español neutro, claro y profesional.
    - No uses emojis ni lenguaje informal.
    - Mantén la respuesta entre 5 y 10 líneas en total.
    - No uses formato Markdown (sin asteriscos, sin #).
    - Estructura tu respuesta en exactamente 3 párrafos cortos:
        1. Observaciones clave sobre precios e interacciones por categoría.
        2. Categoría más rentable y categoría con mayor atención de usuarios.
        3. Recomendación estratégica de Cross-Selling o acción comercial concreta.

    DATOS (${totalProducts} productos en total, agrupados por categoría):
    ${dataList}
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const result = await response.json();
    console.log(result);

    if (result.error) {
      $('#respuesta_ia').html(`<span style="color:red;">Error de API: ${result.error.message}</span>`);
      return;
    }

    if (!result.choices || !result.choices.length) {
      $('#respuesta_ia').html('<span style="color:red;">No se recibió respuesta del modelo.</span>');
      return;
    }

    // Convertir saltos de línea en <br> para que se vea bien en HTML
    const texto = result.choices[0].message.content
      .trim()
      .replace(/\n/g, '<br>');

    $('#respuesta_ia').html(texto);

  } catch (error) {
    $('#respuesta_ia').html(`<span style="color:red;">Error al conectar con la IA: ${error.message}</span>`);
  }
}