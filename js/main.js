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

  function Supermarket(supermarket, url) {
    this.supermarket = supermarket
    this.url = url
    this.yql = new YQL(url)
  }

  Supermarket.prototype = {
    select: function (xpath) {
      return this.yql.select(xpath)
    },

    appendImage: function (attrs) {
      var img = document.createElement('img')
      img.src = attrs.src
      img.className = 'img-responsive'
      this.append(img)
    },

    appendIframe: function () {
      var iframe = document.createElement('iframe')
      iframe.src = this.url
      iframe.width = '100%'
      iframe.height = '500'
      this.append(iframe, 'col-xs-10')
    },

    append: function (el, wrapperClass) {
      this.$wrapper(wrapperClass).append(el).appendTo('#js-' + this.supermarket + '-items')
    },

    $wrapper: function (className) {
      className = (className || 'col-xs-12 col-sm-6 col-md-4') + ' supermarket-col'
      return jQuery('<div>', { 'class': className })
    }
  }

  function Carrefour() {
    Supermarket.call(this, 'carrefour', 'http://www.carrefour.com.ar/promociones')
  }
  Carrefour.prototype = Object.create(Supermarket.prototype)

  function Disco() {
    Supermarket.call(this, 'disco', 'http://www.disco.com.ar/ofertas-Capital-Federal-y-GBA_26.html')
  }
  Disco.prototype = Object.create(Supermarket.prototype)

  function Dia() {
    Supermarket.call(this, 'dia', 'https://www.supermercadosdia.com.ar/ahorramesdia/')
  }
  Dia.prototype = Object.create(Supermarket.prototype)


  //
  // Carrefour
  //
  var carrefour = new Carrefour()
  carrefour.select('//div[contains(@class, "promo-landing-content-principal-image")]/img').done(function (results) {
    results.img.forEach(carrefour.appendImage.bind(carrefour))
  })

  //
  // Disco
  //
  var disco = new Disco()
  disco.select('//li[@class="thumbnails"]/img').done(function (results) {
    results.img.map(function (img) {
      return {
        src: 'http://www.disco.com.ar/' + img.src.replace('/small/', '/org/')
      }
    }).forEach(disco.appendImage.bind(disco))
  })

  //
  // Dia
  //
  var dia = new Dia()
  dia.select('//img[contains(@class, "aligncenter")]').done(function (results) {
    dia.appendImage(results.img)
  }).fail(function (error) {
    dia.appendIframe()
  })
})()
