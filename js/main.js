(function() {
  function YQL(url) {
    if (!url) throw "You must provide an URL to scrape (YQL)."
    this.url = url
  }

  YQL.prototype = {
    select: function (whereClause) {
      return this.httpGet(
        this.buildQuery(whereClause)
      )
    },

    buildQuery: function (whereClause) {
      var where = "where url='" + this.url + "'"
      for(var prop in whereClause) {
        where += " and " + prop + " = '" + whereClause[prop] + "'"
      }
      return "select * from html " + where
    },

    httpGet: function (query) {
      var deferred = jQuery.Deferred()

      jQuery.ajax({
        url: 'http://query.yahooapis.com/v1/public/yql',
        data: {
          q: query,
          format: 'json'
        }
      }).done(function (content) {
        if (content.query && content.query.count) {
          deferred.resolve(content.query.results)
        } else {
          deferred.reject('No results found')
        }
      }).error(deferred.reject)

      return deferred.promise()
    }
  }

  function JSONP(url) {
    if (!url) throw "You must provide an URL to request (JSONP)."
    this.url = encodeURIComponent(url)
  }

  JSONP.prototype = {
    select: function (whereClause) {
      var deferred = jQuery.Deferred()
      var selector = whereClause.xpath

      jQuery.ajax({
        url: 'https://jsonp.afeld.me/?callback=?&url=' + this.url,
        dataType: 'jsonp'
      }).done(function (content) {
        if (content && content.data) {
          deferred.resolve(
            jQuery(content.data).find(selector)
          )
        } else {
          deferred.reject('No results found')
        }
      }).error(deferred.reject)

      return deferred.promise()
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
      jQuery('<div>', { 'class': 'col-xs-12 placeholder' }) //FUUUU
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
      key   : 'cotomarcalider',
      name  : 'Coto (Marca líder)',
      link  : 'http://www.coto.com.ar/ofertas/marca-lider/ie.html',
      select: '//div[contains(@class, "list_images")]/img',
      extractOffers: function (results) {
        return results.img.map(function (img) {
          return { src: 'http://www.coto.com.ar/ofertas/marca-lider/' + img.src }
        })
      }
    },
    {
      key   : 'dia',
      name  : 'Dia',
      link  : 'https://www.supermercadosdia.com.ar/ahorramesdia/',
      select: 'img.aligncenter',
      jsonp : true,
      extractOffers: function (results) {
        return results.map(function(index, img) {
          return { src: img.src }
        }).toArray()
      }
    },
    {
      key   : 'disco',
      name  : 'Disco',
      link  : 'https://www.disco.com.ar/Comprar/Home.aspx#_atCategory=true&_atGrilla=false&_id=75',
      select: '//div[@class="owl-item"]/img[@class="desktop"]',
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

  var template = new Template('#js-main')

  var promises = SUPERMARKETS.map(function (supermarket, index) {
    template.render(supermarket)
    var Client = supermarket.jsonp ? JSONP : YQL

    return new Client(supermarket.link)
      .select({ xpath: supermarket.select })
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
              height: '1000'
            })

            $(window).off(event)
          }
        })
      })
  })

  jQuery.when.apply(jQuery, promises).always(function () {
    window.scrollTo(0, 0)
    jQuery('body').scrollspy({ target: '#navbar-supermarkets', offset: 60 })

    imagesLoaded(document.getElementById("js-main"), function () {
      jQuery("#js-social-buttons").trigger('mouseover')
      jQuery('#js-main-loading').fadeOut('fast')
    })
  })

  jQuery(".js-supermarket-nav").on('click', function(event) {
   var hash = this.hash
   event.preventDefault()

    jQuery('html, body').animate({
      scrollTop: jQuery(hash).offset().top
    }, 300, function(){
       window.location.hash = hash
    })
  })

  jQuery("#js-main")
    .on('click', '.js-supermarket-hide', function(event) {
      var selector = jQuery(this).data('selector')

      this.innerText = {
        'Ocultar ↑': 'Mostrar ↓',
        'Mostrar ↓': 'Ocultar ↑'
      }[this.innerText]

      jQuery(selector).toggleClass('collapse')
      event.preventDefault()
    })
    .on('click', '.js-caption-link', function(event) {
      var selector = jQuery(this).data('selector')
      jQuery(selector).click()
      event.preventDefault()
    })

  jQuery("#js-social-buttons").one('mouseover', function startSocialSharing () {
    if (typeof Socialite === 'undefined') {
      setTimeout(startSocialSharing, 100)
    } else {
      Socialite.setup({
        facebook: { lang: 'es_LA' },
        twitter : { lang: 'es_LA' }
      })
      Socialite.load()
    }
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
})()
