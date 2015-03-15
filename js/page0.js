
$("#logo").fadeIn(3000);

$(document).ready(function() {
    setTimeout(function() {
        $("#logo").fadeOut(3000);
    },3000);
});

$(document).click(function() {
    $("#logo").fadeOut(1000);
});
