(function() {
  'use strict'

  //
  // Requests to the web. Using YQL of JSONP

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
        if (whereClause[prop]) {
          where += " and " + prop + " = '" + whereClause[prop] + "'"
        }
      }
      return "select * from html " + where
    },

    httpGet: function (query) {
      var deferred = jQuery.Deferred()

      jQuery.ajax({
        url: 'https://query.yahooapis.com/v1/public/yql',
        data: {
          q: query,
          format: 'json',
          jsonCompat: 'new',
        },
        dataType: 'jsonp'
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
  // Template singleton

  var template = {
    // Avoid external scripts from overriding the global template object
    t: t,
    render: function (name, data) {
      var htmlTemplate = new template.t(
        document.getElementById('js-' + name + '-template').innerHTML
      )
      return htmlTemplate.render(data)
    }
  }

  //
  // Iframe singleton

  var iframe = {
    _loading: false,
    load: function (attrs, parent) {
      if (iframe._loading) {
        setTimeout(iframe.load.bind(iframe, attrs, parent), 1000)
        return
      } else {
        iframe._loading = true
      }

      var $iframe = jQuery('<iframe>', {
        src   : attrs.src,
        width : attrs.width,
        height: attrs.height
      })
      .css('display', 'none')

      var $placeholder = jQuery(parent).find('.placeholder.loading')

      $placeholder.children().replaceWith($iframe)

      $iframe.load(function () {
        $placeholder.removeClass('placeholder loading')
        $iframe.slideDown()
        iframe._loading = false
      })
    }
  }


  //
  // Helps building the element that contains the data

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

      jQuery('<div>', {
        'class'         : 'col-xs-12 col-sm-6 col-md-4',
        'data-toggle'   : 'tooltip',
        'data-placement': 'top',
        'title'         : attrs.title
      })
      .append($a)
      .appendTo(this.el)
    },

    placeholder: function (child) {
      jQuery('<div>', { 'class': 'col-xs-12 placeholder' })
        .append(child)
        .appendTo(this.el)
    },

    iframe: function (attrs) {
      iframe.load(attrs, this.el)
    },

    loading: function () {
      jQuery(this.el).find('.placeholder').addClass('loading')
    }
  }

  //
  // Uses the other objects to show supermarket data on the DOM

  function Supermarket(attrs) {
    this.attrs  = attrs
  }

  Supermarket.prototype = {
    render: function () {
      jQuery('#js-main').append(
        template.render('supermarket', this.attrs)
      )
      return this.load()
    },

    load: function () {
      return this.select()
        .done(this.appendFromResults.bind(this))
        .fail(this.appendFallbackIframe.bind(this))
    },

    select: function () {
      var Client = this.attrs.jsonp ? JSONP : YQL

      if (this.attrs.links) {
        var promises = this.attrs.links.map(function(link) {
          return new Client(link).select({ xpath: this.attrs.select })
        }, this)

        return jQuery.when.apply(jQuery, promises)
      } else {
        return new Client(this.attrs.link).select({ xpath: this.attrs.select })
      }
    },

    appendFromResults: function (results) {
      var images = this.attrs.extractOffers(arguments.length === 1 ? results : Array.prototype.slice.call(arguments))
      new HtmlContainer(this.attrs.key).appendImages(images)
    },

    appendFallbackIframe: function (error) {
      var link = this.attrs.link
      var container = new HtmlContainer(this.attrs.key)
      var noticeHTML = template.render('notice', { link: link })
      
      if (isSafari()) {
        container.placeholder(noticeHTML)
        return
      }

      var placeholderChild = jQuery('<span>', {
        "class": 'js-iframe-notice',
        "html": noticeHTML + ' o '
      })

      var loadIframeLink = jQuery('<a>', {
          href: link,
          text: 'cargarlo aquí'
        }).on('click', function () {
          container.loading()
          container.iframe({
            src   : link,
            width : '100%',
            height: '1000'
          })
          return false
        })
        .appendTo(placeholderChild)

      container.placeholder(placeholderChild)
    }
  }

  //
  // Fetch and render

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
      link  : 'http://www.coto.com.ar/ofertas/revista-de-ofertas/ie.html',
      select: '//div[contains(@class, "list_images")]/img',
      extractOffers: function (results) {
        return results.img.map(function (img) {
          return { src: 'http://www.coto.com.ar/ofertas/revista-de-ofertas/' + img.src }
        })
      }
    },
    {
      key   : 'dia',
      name  : 'Dia',
      link  : 'https://www.supermercadosdia.com.ar/ofertas/',
      links : [
        'https://www.supermercadosdia.com.ar/category/dia-market',
        'https://www.supermercadosdia.com.ar/category/dia-mini',
        'https://www.supermercadosdia.com.ar/category/dia-plus'
      ],
      select: '//ul[contains(@class, "slides")]/li/img',
      extractOffers: function (resultsArray) {
        var supermarkets = ['Dia Market', 'Dia Mini', 'Dia Plus']
        var result = []

        resultsArray.forEach(function (response, index) {
          var title = supermarkets[index]

          response.img.forEach(function (img) {
            result.push({ src: img.src, title: title })
          })
        })
        
        return result
      }
    },
    {
      key   : 'diaahorrames',
      name  : 'Dia (ahorrames)',
      link  : 'https://www.supermercadosdia.com.ar/ahorramesdia/',
      select: '//img[contains(@class, "aligncenter")]',
      extractOffers: function (result) {
        return [{ src: result.img.src }]
      }
    },
    {
      key   : 'jumbo',
      name  : 'Jumbo',
      link  : 'https://www.jumbo.com.ar/Comprar/Home.aspx#_atCategory=true&_atGrilla=false&_id=5',
      select: '//div[@class="owl-item"]/img[@class="desktop"]',
      extractOffers: function (results) { return results.img }
    },
    {
      key   : 'disco',
      name  : 'Disco',
      link  : 'https://www.disco.com.ar/Comprar/Home.aspx#_atCategory=true&_atGrilla=false&_id=75',
      select: '//div[@class="owl-item"]/img[@class="desktop"]',
      extractOffers: function (results) { return results.img }
    },
  ]

  //
  // Load supermarket offers

  var promises = SUPERMARKETS.map(function (attributes) {
    return new Supermarket(attributes).render()
  })

  jQuery.when.apply(jQuery, promises).always(function () {
    window.scrollTo(0, 0)
    jQuery('body').scrollspy({ target: '#navbar-supermarkets', offset: 60 })

    imagesLoaded(document.getElementById("js-main"), function () {
      setTimeout(function () {
        jQuery("#js-social-buttons").trigger('mouseover')
      }, 1000)

      jQuery('#js-loading').fadeOut('fast')
      jQuery('#js-footer').removeClass('hidden')

      jQuery('[data-toggle="tooltip"]').tooltip()
    })
  })

  //
  // Animate scroll navigation

  jQuery(".js-supermarket-nav").on('click', function(event) {
   var hash = this.hash
   event.preventDefault()

    jQuery('html, body').animate({
      scrollTop: jQuery(hash).offset().top
    }, 300, function(){
       window.location.hash = hash
    })
  })

  //
  // Actions to the right, show/hide content

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

  //
  // Share on TWT/FB

  jQuery("#js-social-buttons").one('mouseover', function() {
    Socialite.setup({
      facebook: { lang: 'es_LA' },
      twitter : { lang: 'es_LA' }
    })
    Socialite.load()
  })

  //
  // Lightbox

  lightbox.option({ albumLabel: '%1 / %2' })

  //
  // Utils

  function isElementInViewport(el) {
    var rect = el.getBoundingClientRect()

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  function isSafari() {
    // This is really awful.
    // Safari can't load some iframes properly because of the way they handle redirection to set cookies
    // Instead of just removing the iframes for all browsers, try to detect Safari and break early
    return navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
           navigator.userAgent && !navigator.userAgent.match('CriOS')
  }
})()
