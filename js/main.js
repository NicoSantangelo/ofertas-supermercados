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

  var Column = function (type) {
    this.type = type
    this.container = '#js-' + this.type + '-items'
  }

  Column.prototype = {
    appendImages: function(images) {
      images.forEach(this.appendImage.bind(this))
    },

    appendImage: function(attrs) {
      var img = document.createElement('img')
      img.src = attrs.src
      img.className = 'img-responsive'

      jQuery('<div>', { 'class': this.addBaseClass('col-xs-12 col-sm-6 col-md-4') })
        .append(img)
        .appendTo(this.container)
    },

    appendIframe: function (attrs) {
      var iframe = document.createElement('iframe')
      iframe.src = attrs.src
      iframe.width = attrs.width
      iframe.height = attrs.height

      jQuery('<div>', { 'class': this.addBaseClass('col-xs-10') })
        .append(iframe)
        .appendTo(this.container)
    },

    addBaseClass: function (className) {
      return className + ' ' + this.type
    }
  }


  //
  // Carrefour
  //
  new YQL('http://www.carrefour.com.ar/promociones')
    .select('//div[contains(@class, "promo-landing-content-principal-image")]/img')
    .done(function (results) {
      new Column('carrefour').appendImages(results.img)
    })

  //
  // Disco ahorrames
  //
  new YQL('http://www.disco.com.ar/ofertas-Capital-Federal-y-GBA_26.html')
    .select('//li[@class="thumbnails"]/img')
    .done(function (results) {
      var images = results.img.map(function (img) {
        return { src: 'http://www.disco.com.ar/' + img.src.replace('/small/', '/org/') }
      })
      new Column('disco').appendImages(images)
    })

  //
  // Dia
  //
  new YQL('https://www.supermercadosdia.com.ar/ahorramesdia/')
    .select('//img[contains(@class, "aligncenter")]')
    .done(function (results) {
      new Column('dia').appendImage(results.img)
    }).fail(function (error) {
      new Column('dia').appendIframe({
        src   : 'https://www.supermercadosdia.com.ar/ahorramesdia/',
        width : '100%',
        height: '500'
      })
    })

  //
  // Coto semanal
  //
  new YQL('http://www.coto.com.ar/ofertas/semanal/ie.html')
    .select('//div[contains(@class, "list_images")]/img')
    .done(function (results) {
      var images = results.img.map(function (img) {
        return { src: 'http://www.coto.com.ar/ofertas/semanal/' + img.src }
      })
      new Column('coto').appendImages(images)
    })

  // Coto marca lider ( http://www.coto.com.ar/ofertas/marca-lider/ie.html )
  // Coto precios imposibles ( parse http://www.coto.com.ar/ofertas/ //div[@class="deck"/div] )
})()
