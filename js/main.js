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

  //
  //

  var Template = function (rootSelector) {
    this.rootSelector = rootSelector || 'body'
    this.html = document.getElementById('js-supermarket-template').innerHTML
    this.template = new t(this.html)
  }

  Template.prototype = {
    render: function (data) {
      jQuery(this.rootSelector).append(
        this.template.render(data)
      )
    }
  }

  //
  //

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

      var $a = jQuery('<a>', {
        'href': attrs.src,
        'data-lightbox': this.type
      }).append(img)

      jQuery('<div>', { 'class': 'col-xs-12 col-sm-6 col-md-4' })
        .append($a)
        .appendTo(this.container)
    },

    appendIframe: function (attrs) {
      var iframe = document.createElement('iframe')
      iframe.src = attrs.src
      iframe.width = attrs.width
      iframe.height = attrs.height

      jQuery('<div>', { 'class': 'col-xs-10' })
        .append(iframe)
        .appendTo(this.container)
    }
  }

  //
  // Render
  //

  var SUPERMARKETS = [
    {
      key   : 'carrefour',
      name  : 'Carrefour',
      link  : 'http://www.carrefour.com.ar/promociones',
      select: '//div[contains(@class, "promo-landing-content-principal-image")]/img',
      extractOffers: function (results) { return results.img.length ? results.img : [results.img] }
    },
    {
      key   : 'disco',
      name  : 'Disco',
      link  : 'http://www.disco.com.ar/ofertas-Capital-Federal-y-GBA_26.html',
      select: '//li[@class="thumbnails"]/img',
      extractOffers: function (results) {
        return results.img.map(function (img) {
          return { src: 'http://www.disco.com.ar/' + img.src.replace('/small/', '/org/') }
        })
      }
    },
    {
      key   : 'coto',
      name  : 'Coto',
      link  : 'http://www.coto.com.ar/ofertas/semanal/ie.html',
      select: '//div[contains(@class, "list_images")]/img',
      extractOffers: function (results) {
        return results.img.map(function (img) {
          return { src: 'http://www.coto.com.ar/ofertas/semanal/' + img.src }
        })
      }
    },
    {
      key   : 'dia',
      name  : 'Dia',
      link  : 'https://www.supermercadosdia.com.ar/ahorramesdia/',
      select: '//img[contains(@class, "aligncenter")]',
      extractOffers: function (results) { return results.img }
    },
    {
      key   : 'jumbo',
      name  : 'Jumbo',
      link  : 'https://www.jumbo.com.ar/Comprar/Home.aspx#_atCategory=true&_atGrilla=false&_id=5',
      select: '//div[@class="owl-item"]/img[@class="desktop"]',
      extractOffers: function (results) { return results.img }
    }
  ]

  var template = new Template('#main')

  var promises = SUPERMARKETS.map(function (supermarket) {
    template.render(supermarket)

    return new YQL(supermarket.link)
      .select(supermarket.select)
      .done(function (results) {
        var images = supermarket.extractOffers(results)
        new Column(supermarket.key).appendImages(images)
      })
      .fail(function (error) {
        setTimeout(function () {
          new Column(supermarket.key).appendIframe({
            src   : supermarket.link,
            width : '100%',
            height: '500'
          })
        }, 1000)
      })
  })

  jQuery.when.apply(jQuery, promises).always(function () {
    window.scrollTo(0, 0)
    document.getElementById('js-main-loading').remove()
    $('body').scrollspy({ target: '#navbar-supermarkets', offset: 50 })
  })

  $("#navbar-supermarkets ul li a[href^='#']").on('click', function(event) {
   var hash = this.hash
   event.preventDefault()

    $('html, body').animate({
      scrollTop: $(hash).offset().top
    }, 300, function(){
       window.location.hash = hash
    })
  })

  // Coto marca lider ( http://www.coto.com.ar/ofertas/marca-lider/ie.html )
  // Coto precios imposibles ( parse http://www.coto.com.ar/ofertas/ //div[@class="deck"/div] )
})()
