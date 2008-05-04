var Shrubbery = Class.create({
	initialize: function (el) {
		el = $(el);
    
    if ($w("ol ul").include(el.nodeName.toLowerCase())) {
      var list = el
      el = list.wrap().addClassName('adjacent-list')
    } else {
      var list = el.down('ol') || el.down('ul')
    }
		
    // stack of opened stuff
		this.stack = [];
		this.stack.push(list);
		this.lastSelected = null;
    
    this.position = 0; // track carousel
		this.maxLevel = 0;
		
    // wrap everything in a div that will act as carousel
    this.wrapper = list.wrap().addClassName('wrapper').makePositioned().setStyle({top:0, left:0})
		el.makeClipping()

    this.effect = new Shrubbery.SetStyleEffect(this.wrapper, {duration: .2})
		
		// traverse nested lists and make a mess out of it
		this.listSetup(list);
    var _this = this
	  this.wrapper.observe('click', function(e) {
      var li = e.findElement('li')
      if (li) _this.itemToggle(li)
    }).observe('mouseover', function(e) {
      if (e.element().match('span.expand')) _this.itemToggle(e.element().up('li'), true)
    })
    
		this.columnWidth = Number(list.getWidth())
	},
  
	listSetup: function (list, level) {
		level = level || 1;
    if (level > this.maxLevel) this.maxLevel = level
		
		list.immediateDescendants().each(function(li){
			li.level = level;

			if (li.sublist = li.down('ol') || li.down('ul')) {
        // extract sublist from nesting to make adjacent list possible
				this.wrapper.appendChild(li.sublist);
				li.sublist.hide()
				li.addClassName('has-sublist');
				
				this.listSetup(li.sublist, level + 1);
        
        var item = li.down('a') || li.down('span.class')
        if (item) item.insert(' <span class="expand">&raquo;</span>')
			}
		}, this);
	},
  
	itemToggle: function (item, noActivate) {
    if (item.hasClassName('expand')) return false
    
		while (this.stack.length > item.level) {
			var prev = this.stack.pop();
			prev.removeClassName('expand');
			if (prev.sublist) prev.sublist.hide();
		}
		if (!noActivate) {
      if (this.lastSelected) this.lastSelected.removeClassName('selected');
      item.addClassName('selected');
      this.lastSelected = item;
    }
    
    var shifting = this.checkCarousel(item.level + (item.sublist ? 1 : 0))
    
		if (item.sublist) {
			item.addClassName('expand');
      
      if (this.effect && !shifting) {
        var fx = new Shrubbery.SetStyleEffect(item.sublist, {duration: .2})
        item.sublist.setStyle({ opacity:0 }).show()
        fx.start({ opacity: 1 })
      }
      else item.sublist.show()
		}
    
		this.stack.push(item);
    return true
	},
  
	checkCarousel: function (targetLevel) {
    if (targetLevel < 1 || targetLevel > this.maxLevel) {
      console.warn('targetLevel (%d) out of bounds, ignoring ...', targetLevel)
    }
    else {
    	var delta, targetPosition = targetLevel - this.columns
      if (targetPosition < 0) targetPosition = 0
      delta = targetPosition - this.position
      
      if (delta) {
        // console.log("shift by: %d", delta)
        this.position = targetPosition
        var newIndent = -this.position * this.columnWidth
        if (this.effect) this.effect.start({ left: newIndent })
        else this.wrapper.style.left = newIndent
        
        return true
      }
    }
    return false
	}
})

// based on Bernie's Animator
Shrubbery.Effect = Class.create({
  initialize: function(options) {
    this.options = Object.extend({
      interval: 20,
      duration: 0.4,
      onComplete: function(){},
      transition: function(pos){ return ((-Math.cos(pos*Math.PI)/2) + 0.5) }
    }, options);
  },
  seekFromTo: function(from, to) {
    this.target = Math.max(0, Math.min(1, to));
    this.state  = Math.max(0, Math.min(1, from));
    if (!this.interval) {
      var _this = this, ticker = function(){ _this.tick() }
      this.interval = window.setInterval(ticker, this.options.interval);
    }
  },
  start: function() {
    this.seekFromTo(0, 1)
  },
  tick: function() {
    var movement = (this.options.interval / (this.options.duration * 1000)) * (this.state < this.target ? 1 : -1);
    if (Math.abs(movement) >= Math.abs(this.state - this.target)) {
      this.state = this.target;
    } else {
      this.state += movement;
    }
    
    try {
      this.transition(this.options.transition(this.state));
    } finally {
      if (this.target == this.state) {
        window.clearInterval(this.interval);
        this.interval = null;
        this.options.onComplete.call(this);
      }
    }
  },
  transition: function(value) {
    console.log(value)
  }
})

Shrubbery.SetStyleEffect = Class.create(Shrubbery.Effect, {
  initialize: function($super, element, options) {
    $super(options)
    this.element = $(element)
  },
  transition: function(value) {
    var style = {}
    this.properties.each(function(pair) {
      var current = (pair.value[1] - pair.value[0]) * value + pair.value[0]
      style[pair.key] = current
      if (pair.key != 'opacity') style[pair.key] += 'px'
    })
    this.element.setStyle(style)
  },
  start: function($super, properties) {
    this.properties = new Hash
    $H(properties).each(function(pair) {
      var from = this.element.getStyle(pair.key)
      if (Object.isString(from)) from = Number(from.replace(/px|pt/, ''))
      this.properties.set(pair.key, [from, pair.value])
    }, this)
    $super()
  }
})
