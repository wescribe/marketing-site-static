jQuery.noConflict();
jQuery( document ).ready(function( $ ) {
  var TxtType = function(el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    this.txt = '';
    this.tick();
    this.isDeleting = false;
};

TxtType.prototype.tick = function() {
    var i = this.loopNum % this.toRotate.length;
    var fullTxt = this.toRotate[i];

    if (this.isDeleting) {
    this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
    this.txt = fullTxt.substring(0, this.txt.length + 1);
    }

    this.el.innerHTML = '<span class="wrap">'+this.txt+'</span>';

    var that = this;
    var delta = 200 - Math.random() * 100;

    if (this.isDeleting) { delta /= 2; }

    if (!this.isDeleting && this.txt === fullTxt) {
    delta = this.period;
    this.isDeleting = true;
    } else if (this.isDeleting && this.txt === '') {
    this.isDeleting = false;
    this.loopNum++;
    delta = 500;
    }

    setTimeout(function() {
    that.tick();
    }, delta);
};


if($('.typewrite').length){
  window.onload = function() {
    var elements = document.getElementsByClassName('typewrite');
    for (var i=0; i<elements.length; i++) {
        var toRotate = elements[i].getAttribute('data-type');
        var period = elements[i].getAttribute('data-period');
        if (toRotate) {
          new TxtType(elements[i], JSON.parse(toRotate), period);
        }
    }
    // INJECT CSS
    var css = document.createElement("style");
    css.type = "text/css";
    css.innerHTML = ".typewrite > .wrap { border-right: 0.08em solid rgba(255,255,255,0)}";
    document.body.appendChild(css);

    var typewriteElement = document.querySelector('.typewrite');
    typewriteElement.style.width = '100%';
  };
};

$("body").removeClass("preload");

// On tab nav click, activate that tab
$(function() {
  $('.features-list li').click(function() {

    // Check for active
    $('.features-list li').removeClass('active');
    $(this).addClass('active');

    // Display active tab
    let activeFeature = $(this).data("feature");
    $('.features-list-visuals li').removeClass('active');
    $(".features-list-visuals").find(`[data-feature='${activeFeature}']`).addClass('active');

    return false;
  });
});

// Hide Header on scroll down
var didScroll;
var lastScrollTop = 0;
var delta = 100;
var navbar = $('header#wrapper-navbar');
var navbarHeight = $('header#wrapper-navbar').outerHeight();

$(window).scroll(function(event){
  didScroll = true;
});

setInterval(function() {
  if (didScroll) {
    hasScrolled();
    didScroll = false;
  }
}, 250);

function hasScrolled() {
  var st = $(this).scrollTop();

  // Add shadow to header when not scrolled to the top
  if (st >= 1) {
    navbar.addClass("nav-shadow");
  } else {
    navbar.removeClass("nav-shadow");
  }

  // Make sure they scroll more than delta
  if(Math.abs(lastScrollTop - st) <= delta)
      return;

  // If they scrolled down and are past the navbar, add class .nav-up.
  // This is necessary so you never see what is "behind" the navbar.
  if (st > lastScrollTop && st > navbarHeight){
    // Scroll Down
    $('header#wrapper-navbar').removeClass('nav-down').addClass('nav-up');
  } else {
    // Scroll Up
    if(st + $(window).height() < $(document).height()) {
      $('header#wrapper-navbar').removeClass('nav-up').addClass('nav-down');
    }
  }

  lastScrollTop = st;
}

if($('#use-cases-slider').length){
  //console.log("UCS exists")

  $('#use-cases-slider').slick({
    centerMode: true,
    centerPadding: '5px',
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    mobileFirst: true,
    infinite: true,
    lazyLoad: 'ondemand',
    responsive: [
      {
        breakpoint: 1160,
        settings: {
          centerPadding: '80px',
          slidesToShow: 3
        }
      },{
        breakpoint: 768,
        settings: {
          centerPadding: '20px',
          slidesToShow: 3
        }
      },
      {
        breakpoint: 640,
        settings: {
          centerPadding: '5px',
          slidesToShow: 2
        }
      }
    ]
  });

  // Ability to slide on the slides to transition to other slides
  $('#use-cases-slider.slick-slider').on('click', '.slick-slide', function (e) {
    e.stopPropagation();
    var index = $(this).data("slick-index");
    if ($('.slick-slider').slick('slickCurrentSlide') !== index) {
      $('.slick-slider').slick('slickGoTo', index);
    }
  });
} else {
  //console.log("UCS doesnt exist")
}

// Netlify form email validation
// Validate beta signup form email
var emailInput;
$(".beta-email").on("change", function() {
  emailInput = $(this).val();
  if (validateEmail(emailInput)) {
    $(this).removeClass('invalid');
  } else {
    $(this).addClass('invalid');
  }
  if (emailInput === "") {
    $(this).removeClass('invalid');
  }
});

// $(".btn-beta-signup").on("click", function(e) {
//   e.preventDefault();
//   if (validateEmail(emailInput)) {
//     $("#beta-signup").submit();
//   }
// });

$("#beta-signup").submit(function(e) {
  e.preventDefault();

  if (validateEmail(emailInput)) {
    var $form = $(this);
    $.post($form.attr("action"), $form.serialize()).then(function() {
      //alert("Thank you!");
      $('.beta-email').val('');
      $('.beta-signup-home-hero-msg').addClass('active');
    });
  }
  else {
    console.log("Invalid email")
  }
});

// Validate beta signup form email (Footer version)
var emailInput;
$(".beta-email-footer").on("change", function() {
  emailInput = $(this).val();
  if (validateEmail(emailInput)) {
    $(this).removeClass('invalid');
  } else {
    $(this).addClass('invalid');
  }
  if (emailInput === "") {
    $(this).removeClass('invalid');
  }
});

$(".btn-beta-signup-footer").on("click", function(e) {
  e.preventDefault();
  if (validateEmail(emailInput)) {
    $("#beta-signup-footer").submit();
  }
});

function validateEmail(email) {
  var pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return $.trim(email).match(pattern) ? true : false;
}

$(document).ready(function() {

  // Open the mobile navigation
  $(document).on('click', '#mobile-nav-toggle .hamburger.is-inactive', function() {
    $('#mobile-nav-toggle .hamburger').removeClass('is-inactive');
    $('#mobile-nav-toggle .hamburger').addClass('is-active');
    $('body').addClass('navigation-open navigation-transition-open');
    $('body').removeClass('navigation-closed');
    $('#page-content').bind('touchmove', function(e){e.preventDefault()});
    //console.log('tapped to open')
  });

  // Close the mobile navigation
  $(document).on('click', '#mobile-nav-toggle .hamburger.is-active', function() {
    $('#mobile-nav-toggle .hamburger').removeClass('is-active');
    $('#mobile-nav-toggle .hamburger').addClass('is-inactive');
    $('body').addClass('navigation-closing');
    $('body').removeClass('navigation-open');
    $('#page-content').unbind('touchmove');
    //console.log('tapped to close')

    // Closing the navigation with an animation requires incrementally removing the classes with setTimeout
    setTimeout(
      function() {
        $('body').removeClass('navigation-transition-open navigation-closing');
      },
      400 // Needs to match the CSS transition speed
    );
    setTimeout(
      function() {
        $('body').addClass('navigation-closed');
      },
      451
    );
  });

});

// NOTE: This JS will be needed later when we add child elements to the navigation
// $(document).ready(function() {
//   // Expand & Collapse children
//   $(document).on('tap', '.header-nav li.menu-item-has-children', function(e) {
//     e.preventDefault();
//     $(this).toggleClass('expanded');
//     //console.log("expanded")
//   });

//   $(document).on('tap', '.header-nav li.menu-item-has-children li a', function(e) {
//     $(this).trigger('tap');
//     //$(this).toggleClass('expanded');
//     //console.log("clicked child link")
//   });
// });

// Pricing - Annual vs Monthly toggle
$(document).ready(function() {

  // Switch to Annual
  $(document).on('click', '#option-annual', function() {
    $('#option-monthly').removeClass('active');
    $(this).addClass('active');
    $('.monthly-price .annually').addClass('active');
    $('.monthly-price .monthly').removeClass('active');
    $('.paid-annually').addClass('active');
    console.log("annual")
  });

  // Switch to Monthly
  $(document).on('click', '#option-monthly', function() {
    $('#option-annual').removeClass('active');
    $(this).addClass('active');
    $('.monthly-price .monthly').addClass('active');
    $('.monthly-price .annually').removeClass('active');
    $('.paid-annually').removeClass('active');
    console.log("monthly")
  });
});

})

