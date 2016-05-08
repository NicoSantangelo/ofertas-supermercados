(function() {
  // TODO:
  //  - ALT attrs

  function YQL(url) {
    if (!url) throw "You must provide an URL to scrape (YQL)."
    this.url = url
  }

  YQL.prototype = {
    select: function (xpath) {
      var deferred = jQuery.Deferred()

      jQuery.ajax({
        url: 'http://query.yahooapis.com/v1/public/yql',
        data: {
          format: 'json',
          q: this.buildQuery(xpath)
        }
      }).done(function (content) {
        console.log("Got", content, "from YQL")

        if (content.query && content.query.count) {
          deferred.resolve(content.query.results)
        } else {
          deferred.reject('No results found')
        }
      }).error(deferred.reject)

      return deferred.promise()
    },

    buildQuery: function (xpath) {
      xpath = xpath ? " and xpath='" + xpath + "'" : ""
      return "select * from html where url='" + this.url + "'" + xpath
    }
  }

  function Supermarket(supermarket, src) {
    this.supermarket = supermarket
  }

  Supermarket.prototype = {
    appendImage: function (attrs) {
      var img = document.createElement('img')
      img.src = attrs.src
      img.className = 'img-responsive'
      this.append(img)
    },

    append: function (el) {
      this.$wrapper().append(el).appendTo('#js-' + this.supermarket + '-items')
    },

    $wrapper: function () {
      return jQuery('<div>', { 'class': 'col-xs-12 col-sm-6 col-md-4' })
    }
  }


  //
  // Carrefour
  //
  var carrefour = new Supermarket('carrefour')
  var carrefourQuery = new YQL('http://www.carrefour.com.ar/promociones')
  carrefourQuery.select('//div[contains(@class, "promo-landing-content-principal-image")]/img').done(function (results) {
    results.img.forEach(carrefour.appendImage.bind(carrefour))
  })

  //
  // Disco
  //
  var disco = new Supermarket('disco')
  var discoQuery = new YQL('http://www.disco.com.ar/ofertas-Capital-Federal-y-GBA_26.html')
  discoQuery.select('//li[@class="thumbnails"]/img').done(function (results) {
    results.img.map(function (img) {
      return {
        src: 'http://www.disco.com.ar/' + img.src.replace('/small/', '/org/')
      }
    }).forEach(disco.appendImage.bind(disco))
  })

  //
  // Dia
  //
  var dia = new Supermarket('dia')
  var diaQuery = new YQL('https://www.supermercadosdia.com.ar/ahorramesdia/')
  diaQuery.select('//img[contains(@class, "aligncenter")]').done(function (results) {
    dia.appendImage(results.img)
  }).fail(function (error) {
    var $notice = jQuery('<small>', { text: 'No se pudo obtener los datos de Dia' })
    dia.append($notice)
  })
})()
