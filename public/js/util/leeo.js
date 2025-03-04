class DataStorage {
    constructor() {
        this.storage = {};
    }

    get(elId, key) {
        return this.storage[elId] ? this.storage[elId][key] : null;
    }

    set(elId, key, value) {
        if (!this.storage[elId]) {
            this.storage[elId] = {};
        }
        this.storage[elId][key] = value;
    }
}

class LeeoQuery {
    constructor(selector) {
        if (selector instanceof HTMLElement) {
            this.elements = [selector];
        } else {
            var elements = document.querySelectorAll(selector);
            this.elements = Array.prototype.slice.call(elements);
        }
    }

    data(key, value) {
        const elId = this.elements[0].leeoQueryId;

        if (value === undefined) {
            return elId ? dataStorage.get(elId, key) : null;
        }

        for (const el of this.elements) {
            if (!el.leeoQueryId) {
                el.leeoQueryId = `${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
            }
            dataStorage.set(el.leeoQueryId, key, value);
        }

        return this; // For chaining
    }

    clone() {
        var clonedElements = this.elements.map(function(el) {
            let clone = el.cloneNode(true);
            return clone;
        });
        var clonedObject = new LeeoQuery();
        clonedObject.elements = clonedElements;
        return clonedObject;
    }

    show() {
        this.elements.forEach(function(el) {
            el.style.display = ''; // 将元素的display设置为默认值
        });
        return this; // 为了链式调用
    }

    hide() {
        this.elements.forEach(function(el) {
            el.style.display = 'none'; // 将元素的display设置为none，从而隐藏元素
        });
        return this; // 为了链式调用
    }

    appendTo(target) {
        var targetElements = target instanceof LeeoQuery ? target.elements : new LeeoQuery(target).elements;
        
        // 遍历所有选中的元素
        this.elements.forEach(function(el) {
            // 如果目标是LeeoQuery对象或选择器，我们需要获取目标元素的数组
            // 然后将当前元素添加到每个目标元素的末尾
            targetElements.forEach(function(targetEl) {
                targetEl.appendChild(el); // 克隆节点并添加
            });
        });

        return this; // 为了链式调用
    }

    text(value) {
        return LeeoQuery.Content(this, value, "text");
    }

    html(value) {
        return LeeoQuery.Content(this, value, "html");
    }

    event(eventName, handler, level=null) {
        this.elements.forEach(el => {
            el.addEventListener(eventName, handler);
        });    
        return this;
    }

    off(eventName, handler) {
        this.elements.forEach(el => {
            el.removeEventListener(eventName, handler);
        });
        return this;
    }

    addClass(...class_names) {
        this.elements.forEach(el => {
            el.classList.add(...class_names);
        });
        return this;
    }

    removeClass(...class_names) {
        this.elements.forEach(el => {
            el.classList.remove(...class_names);
        });
        return this;
    }

    class(value) {
        if (value === undefined) {
            // Get class list of the first element
            if (this.elements.length > 0) {
                return this.elements[0].className;
            }
            return null;
        } else {
            // Set class list for all elements
            this.elements.forEach(function(el) {
                el.className = value;
            });
            return this; // For chainability
        }
    }

    attr(name, value = null) {
        if (value == null) {
            return this.elements[0] ? this.elements[0].getAttribute(name) : null;
        }
        this.elements.forEach(el => {
            el.setAttribute(name, value);
        });

        return this;
    }

    create(tag_name, options) {
        return LeeoQuery.create(tag_name, options);
    }

    on(eventName, handler, level=null) {
        this.elements.forEach(el => {
            el.addEventListener(eventName, handler);
        });
        return this;
    }

    appendChild(child) {
        // 如果 child 是一个字符串，创建一个新的 LeeoQuery 对象
        if (typeof child === 'string') {
            child = this.create(child);
        }
        // 如果 child 是一个 LeeoQuery 对象，使用其第一个元素
        if (child instanceof LeeoQuery) {
            child = child.elements[0];
        }
        // 遍历当前 LeeoQuery 对象的所有元素，并将 child 添加为子元素
        this.elements.forEach(function(parent) {
            if (child instanceof LeeoQuery) {
                parent.appendChild(child.elements[0]);
            } else {
                parent.appendChild(child);
            }
        });
        return this; // 返回当前 LeeoQuery 对象以支持链式调用
    }

    for(callback) {
        this.elements.forEach(item=>{
            callback(item);
        });
    }

    find(selector) {
        // 创建一个新的 LeeoQuery 对象，它将包含所有找到的元素
        var foundElements = new LeeoQuery();

        // 遍历当前 LeeoQuery 对象的所有元素
        this.elements.forEach(function(parent) {
            // 在每个父元素内部查找匹配选择器的元素
            var found = parent.querySelectorAll(selector);
            // 将找到的元素添加到 foundElements 的 elements 数组中
            foundElements.elements = foundElements.elements.concat(Array.prototype.slice.call(found));
        });

        // 返回包含找到的元素的新 LeeoQuery 对象
        return foundElements;
    }

    parent() {
        var foundElements = new LeeoQuery();
        this.elements.forEach(element => {
            foundElements.elements = foundElements.elements.concat(element.parentNode);
        })
        return foundElements;
    }

    css(style, value) {
        if (value === undefined) {
            // 如果没有提供value，返回第一个元素的样式值
            if (this.elements.length > 0) {
                return window.getComputedStyle(this.elements[0])[style];
            }
            return null;
        } else {
            // 如果提供了value，设置每个元素的样式
            this.elements.forEach(function(el) {
                el.style[style] = value;
            });
            return this; // 为了链式调用
        }
    }

    empty() {
        this.elements.forEach(function(el) {
            // 清空元素的内容
            el.innerHTML = '';

            // 如果你有保存事件监听器的引用，你可以在这里移除它们
            // 例如: el.removeEventListener('click', savedClickHandler);

            // 移除内联事件监听器
            var attrs = el.attributes;
            for (var i = 0; i < attrs.length; i++) {
                if (attrs[i].name.startsWith('on')) {
                    el[attrs[i].name] = null;
                }
            }
        });
        return this; // 为了链式调用
    }

    remove() {
        this.elements.forEach(function(el) {
            // 检查元素是否有父节点，如果有，则从父节点中移除该元素
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        // 清空elements数组，因为所有元素都已被移除
        this.elements = [];
        return this; // 返回当前LeeoQuery对象以支持链式调用，尽管此时elements数组为空
    }

    get(index) {
        return this.elements[index];
    }

    width(value = null) {
        if (value === null) {
            // 获取第一个元素的宽度
            if (this.elements.length > 0) {
                return this.elements[0].offsetWidth;
            }
            return null;
        } else {
            // 设置所有选中元素的宽度
            this.elements.forEach(function(el) {
                el.style.width = typeof value === 'number' ? value + 'px' : value;
            });
            return this; // 为了链式调用
        }
    }

    height(value = null) {
        if (value === null) {
            // 获取第一个元素的高度
            if (this.elements.length > 0) {
                return this.elements[0].offsetHeight;
            }
            return null;
        } else {
            // 设置所有选中元素的高度
            this.elements.forEach(function(el) {
                el.style.height = typeof value === 'number' ? value + 'px' : value;
            });
            return this; // 为了链式调用
        }
    }

    hslToHex(h, s, l, a = 1) {
        // 将饱和度和亮度的百分比转换为0到1之间的值
        s /= 100;
        l /= 100;

        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs((h / 60) % 2 - 1)),
            m = l - c / 2,
            r = 0,
            g = 0,
            b = 0;

        if (0 <= h && h < 60) {
            r = c;
            g = x;
            b = 0;
        } else if (60 <= h && h < 120) {
            r = x;
            g = c;
            b = 0;
        } else if (120 <= h && h < 180) {
            r = 0;
            g = c;
            b = x;
        } else if (180 <= h && h < 240) {
            r = 0;
            g = x;
            b = c;
        } else if (240 <= h && h < 300) {
            r = x;
            g = 0;
            b = c;
        } else if (300 <= h && h < 360) {
            r = c;
            g = 0;
            b = x;
        }
        // 将RGB值从0到1转换为0到255
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        // 将透明度从0到1的值转换为0到255的整数
        let alpha = Math.round(a * 255);
        const rgb = [
            "#",
            r.toString(16).padStart(2, '0'),
            g.toString(16).padStart(2, '0'),
            b.toString(16).padStart(2, '0'),
            alpha.toString(16).padStart(2, '0')
        ];
        // 将RGB值（和可选的透明度）转换为十六进制字符串
        return rgb.join("");
    }

    generateColors(amount = 10, jump = 6) {
        let colors = [];
        const step = 360 / amount; // 计算步长，确保颜色均匀分布在色相环上

        for (let i = jump; i < amount + jump; i++) {
            // 通过改变色相的起始点和步长来避免相邻颜色过于相近
            let hue = (i * step + (i * 137.5 % 360)) % 360; // 137.5是一个“魔法数字”，用于调整颜色的分布
            colors.push(this.hslToHex(hue, 100, 70)); // 这里假设饱和度和亮度固定，只改变色相
        }
        return colors;
    }

    localString(value_str, minDigits = 2, maxDigits = 2) {
        return LeeoQuery.localString(value_str, minDigits, maxDigits);
    }
}

LeeoQuery.$ = function(selector) {
    return new LeeoQuery(selector);
}

// Initialize data storage
const dataStorage = new DataStorage();

// Initialize LeeoQuery
const $ = LeeoQuery.$;

// Static methods
LeeoQuery.Content = function(obj, value, type) {
    var p = "textContent";
    if (type == "html") {
        p = "innerHTML";
    }
    if (value === undefined) {
        if (obj.elements.length == 0) {
            return null;
        } else if (obj.elements.length > 1) {
            var text_array = [];
            obj.elements.forEach(el => {
                text_array.push(el[p]);
            });
            return text_array;
        } else {
            return obj.elements[0][p];
        }
    } else {
        // 如果提供了 value，则设置所有选中元素的文本内容
        obj.elements.forEach(function(element) {
            element[p] = value;
        });
        return obj; // 为了链式调用
    }
}
$.Content = LeeoQuery.Content;

LeeoQuery.create = function(tag_name, options) {
    const element = document.createElement(tag_name);

    if (options) {
        // Apply options to the element
        if (options.classes) {
            element.classList.add(...options.classes);
        }
        if (options.styles) {
            Object.entries(options.styles).forEach(([property, value]) => {
                element.style[property] = value;
            });
        }
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([name, value]) => {
                element.setAttribute(name, value);
            });
        }
        // Handle other options as needed
    }
    var new_obj = new LeeoQuery(element);
    return new_obj;
}
$.create = LeeoQuery.create;

LeeoQuery.localString = function(value_str, minDigits = 2, maxDigits = 2) {
    var str = Number(value_str);
    if (Number.isInteger(str)) {
        str = str.toLocaleString();
    } else {
        str = str.toLocaleString('en-US', {
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits
        });
    }
    return str;
}

$.localString = LeeoQuery.localString;

export default $;
export  {LeeoQuery, dataStorage};