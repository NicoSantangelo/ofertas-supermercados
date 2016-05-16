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

  var HtmlContainer = function (type) {
    this.type = type
    this.id = 'js-' + this.type + '-items'
    this.el = document.getElementById(this.id)
  }

  HtmlContainer.prototype = {
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
        .appendTo(this.el)
    },

    placeholder: function () {
      jQuery('<div>', { 'class': 'col-xs-offset-1 col-xs-10 placeholder' })
        .appendTo(this.el)
    },

    iframe: function (attrs) {
      var $iframe = $('<iframe>', {
        src: attrs.src,
        width: attrs.width,
        height: attrs.height
      })
      .css('display', 'none')

      var $placeholder = jQuery(this.el)
        .find('.placeholder.loading')
        .append($iframe)

      $iframe.load(function () {
        $placeholder.removeClass('placeholder loading')
        $iframe.slideDown()
      })
    },

    loading: function () {
      jQuery(this.el).find('.placeholder').addClass('loading')
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

  var promises = SUPERMARKETS.map(function (supermarket, index) {
    template.render(supermarket)

    return new YQL(supermarket.link)
      .select(supermarket.select)
      .done(function (results) {
        var images = supermarket.extractOffers(results)
        new HtmlContainer(supermarket.key).appendImages(images)
      })
      .fail(function (error) {
        var event = 'DOMContentLoaded load resize scroll.' + supermarket.key
        var container = new HtmlContainer(supermarket.key)
        container.placeholder()

        $(window).on(event, function () {
          if(isElementInViewport(container.el)) {
            container.loading()

            container.iframe({
              src   : supermarket.link,
              width : '100%',
              height: '500'
            })

            $(window).off(event)
          }
        })
      })
  })

  jQuery.when.apply(jQuery, promises).always(function () {
    window.scrollTo(0, 0)
    $('body').scrollspy({ target: '#navbar-supermarkets', offset: 60 })
    document.getElementById('js-main-loading').remove()
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

  function isElementInViewport(el) {
    var rect = el.getBoundingClientRect()

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  // Coto marca lider ( http://www.coto.com.ar/ofertas/marca-lider/ie.html )
  // Coto precios imposibles ( parse http://www.coto.com.ar/ofertas/ //div[@class="deck"/div] )
})()
