/*(function () {
    // The width and height of the captured photo. We will set the
    // width to the value defined here, but the height will be
    // calculated based on the aspect ratio of the input stream.
    
    var width = 320;    // We will scale the photo width to this
    var height = 0;     // This will be computed based on the input stream
    
    // |streaming| indicates whether or not we're currently streaming
    // video from the camera. Obviously, we start at false.
    
    var streaming = false;
    
    // The various HTML elements we need to configure or control. These
    // will be set by the startup() function.
    
    var video = null;
    var canvas = null;
    var photo = null;
    var startbutton = null;

    function startup() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        photo = document.getElementById('photo');
        startbutton = document.getElementById('buttonTakePicture');

        navigator.getMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

        navigator.getMedia(
            {
                video: true,
                audio: false
            },
            function (stream) {
                if (navigator.mozGetUserMedia) {
                    video.mozSrcObject = stream;
                } else {
                    var vendorURL = window.URL || window.webkitURL;
                    video.src = vendorURL.createObjectURL(stream);
                }
                video.play();
            },
            function (err) {
                console.log("An error occured! " + err);
            }
            );

        video.addEventListener('canplay', function (ev) {
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth / width);
                
                // Firefox currently has a bug where the height can't be read from
                // the video, so we will make assumptions if this happens.
                
                if (isNaN(height)) {
                    height = width / (4 / 3);
                }

                video.setAttribute('width', width);
                video.setAttribute('height', height);
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                streaming = true;
            }
        }, false);

        startbutton.addEventListener('click', function (ev) {
            takepicture();
            ev.preventDefault();
        }, false);

        clearphoto();
    }
    
    // Fill the photo with an indication that none has been
    // captured.
    
    function clearphoto() {
        var context = canvas.getContext('2d');
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, canvas.width, canvas.height);

        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }
    
    // Capture a photo by fetching the current contents of the video
    // and drawing it into a canvas, then converting that to a PNG
    // format data URL. By drawing it on an offscreen canvas and then
    // drawing that to the screen, we can change its size and/or apply
    // other changes before drawing it.
    
    function takepicture() {
        var context = canvas.getContext('2d');
        if (width && height) {
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);

            var data = canvas.toDataURL('image/png');
            photo.setAttribute('src', data);
        } else {
            clearphoto();
        }
    }
    
    // Set up our event listener to run the startup process
    // once loading is complete.
    window.addEventListener('load', startup, false);
})();
*/

function translateElement(elmt, x, y) {
    // Translate the element position
    elmt.style.transform = 
    elmt.style.webkitTransform = 
    'translate(' + x + 'px, ' + y + 'px)';
    // Store it in attached properties
    elmt.setAttribute('x', x);
    elmt.setAttribute('y', y);
}

$(function () {
    var standards = null;
    var selectedStandard = null;

    // Get the available standards and populate
    $.getJSON("data/standards.json", function (data) {
        standards = data;
        selectedStandard = standards[0];
        var comboboxStandards = $("#comboBoxStandard");
        $.each(standards, function () {
            comboboxStandards.append($("<option />")
                .val(this.id).text(this.name));
        });

        comboboxStandards.change(function () {
            var id = $(this).find("option:selected").attr("value");
            var stds = $.grep(standards, function (e) { return e.id == id; });
            if (stds.length) {
                selectedStandard = stds[0];
                alert(selectedStandard.name);
            }
            else {
                // Custom standard
            }
        });
    });

    function uploadImageToServer(file) {
        var formData = new FormData();
        formData.append('uploads[]', file, file.name);
        $.ajax({
            url: '/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (data) {
                console.log('Image upload successful!');
            },
            xhr: function () {
                var xhr = new XMLHttpRequest();
                // listen to the 'progress' event
                xhr.upload.addEventListener('progress', function (evt) {
                    if (evt.lengthComputable) {
                        // calculate the percentage of upload completed
                        var percentComplete = evt.loaded / evt.total;
                        percentComplete = parseInt(percentComplete * 100);

                        // update the Bootstrap progress bar with the new percentage
                        $('.progress-bar').text(percentComplete + '%');
                        $('.progress-bar').width(percentComplete + '%');

                        // once the upload reaches 100%, set the progress bar text to done
                        if (percentComplete === 100) {
                            $('.progress-bar').html('Done');
                        }
                    }
                }, false);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4 && xhr.status == 200) {
                        // We have a sucessful response from the server
                        console.log("Image successfully uploaded to the server");

                        var imageKey = JSON.parse(xhr.responseText);
                        

                    }
                };
                return xhr;
            }
        });
    }

    function createTilePrint(imageKey) {
        
    }

    var viz = (function () {
        // UI Elements
        var m_imgElmt = $("#photo")[0];
        var m_containerElmt = $("#container"); 
        var m_crownMarkElmt = $("#crownMark")[0];
        var m_chinMarkElmt = $("#chinMark")[0];
        
        var m_markerHalfSize = m_crownMarkElmt.style.width/2; // Landmark size
        var m_imageWidth = 0, m_imageHeight = 0; // Width and height in image pixels
        var m_viewPortWidth = 0, m_viewPortHeight = 0; // Width and height of the container

        var m_xleft, m_yleft; // Offset in screen pixels
        var m_zoom;
        var m_ratio;   // Ratio between image pixels and screen pixels

        var setImage = function (imgData) {
            var newImg = new Image();
            newImg.onload = function () {
                m_imageWidth = newImg.width;
                m_imageHeight = newImg.height;
                m_imgElmt.src = imgData;

                calculateViewPort();
                zoomFit();
                renderImage();
                setLandMarks();
            };
            newImg.src = imgData;
        };

        var pixelToScreen = function(elmt, pt) {
            return {
                x: m_xleft + pt.x*m_ratio - elmt.clientWidth/2,
                y: m_ytop + pt.y*m_ratio - elmt.clientHeight/2
            };
        };

        var screenToPixel = function(elmt) {
            return {
                x: elmt.getAttribute('x') + elmt.clientWidth/2 - m_xleft,
                y: elmt.getAttribute('y') + elmt.clientHeight/2 - m_ytop
            };
        }

        var calculateViewPort = function () {
            m_viewPortWidth = m_containerElmt.width();
            m_viewPortHeight = m_containerElmt.height();
            if (m_viewPortHeight > 0 && m_viewPortWidth > 0) {
                //renderImage();
            }
        };

        var setLandMarks = function(crownPoint, chinPoint) {
            // Testing data
            crownPoint = crownPoint || {"x":1.136017e+003, "y":6.216124e+002};
            chinPoint = chinPoint || {"x":1.136017e+003, "y":1.701095e+003};
            
            var p1 = pixelToScreen(m_crownMarkElmt, crownPoint);
            var p2 = pixelToScreen(m_chinMarkElmt, chinPoint);            
            translateElement(m_crownMarkElmt, p1.x, p1.y);
            translateElement(m_chinMarkElmt, p2.x, p2.y);
        };

        var zoomFit = function () {
            var xratio = m_viewPortWidth / m_imageWidth;
            var yratio = m_viewPortHeight / m_imageHeight;
            m_ratio = xratio < yratio ? xratio : yratio;
            m_xleft = m_viewPortWidth / 2 - m_ratio * m_imageWidth / 2;
            m_ytop = m_viewPortHeight / 2 - m_ratio * m_imageHeight / 2;
        };

        var renderImage = function () {
             var xw = m_imageWidth * m_ratio;
             var yh = m_imageHeight * m_ratio;
             m_imgElmt.style.width = '' + xw + 'px';
             m_imgElmt.style.height = '' + yh + 'px';    
             translateElement(m_imgElmt, m_xleft, m_ytop);
        };

        return {
            calculteViewPort: calculateViewPort,
            setImage: setImage,
            zoomFit: zoomFit,
            renderImage: renderImage,
            setLandMarks: setLandMarks
        };

    })();

    $("#loadImage").change(function () {
        var source = this;
        if (source.files && source.files[0]) {
            // Get the file from the input
            var file = source.files[0];
            // Upload the file to the server to detect landmarks
            uploadImageToServer(file);
            // Read the image and display it
            var reader = new FileReader();
            reader.onload = function (e) {
                var imgdata = e.target.result;
                // Set the image to visualise
                viz.setImage(imgdata);
            }
            reader.readAsDataURL(file);
        }
    });

    $(window).resize(function () {
        viz.calculteViewPort();
        viz.zoomFit();
        viz.renderImage();
        viz.setLandMarks();
    });

    
    // Hook the click button to choose picture to the file selection dialog
    $("#buttonLoadPicture").on("click", function () {
        $("#loadImage").click();
        return false;
    });

});


///////////////////////////////////////////////
// Dragging the crown point and chin point
///////////////////////////////////////////////
interact('.landmark')
    .draggable({
        // enable inertial throwing
        inertia: false,
        // keep the element within the area of it's parent
        restrict: {
            restriction: "parent",
            endOnly: true,
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
        },
        // call this function on every dragmove event
        onmove: function (event) {
            var target = event.target;
            // keep the dragged position in the x/y attributes
            var x = (parseFloat(target.getAttribute('x')) || 0) + event.dx;
            var y = (parseFloat(target.getAttribute('y')) || 0) + event.dy;        
            // translate the element
            translateElement(target, x, y);
        },
        // call this function on every dragend event
        onend: function(event) {
            var id = event.target.getAttribute('id');      
        }
    });
