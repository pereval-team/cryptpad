define([
    '/customize/messages.js',
    '/bower_components/jquery/dist/jquery.min.js',
    '/bower_components/bootstrap/js/dropdown.js',
], function (Messages) {
    var $ = window.jQuery;

    var Bar = {
        constants: {},
    };

    /** Id of the div containing the user list. */
    var USER_LIST_CLS = Bar.constants.userlist = 'cryptpad-user-list';

    /** Id of the div containing the lag info. */
    var LAG_ELEM_CLS = Bar.constants.lag = 'cryptpad-lag';

    /** The toolbar class which contains the user list, debug link and lag. */
    var TOOLBAR_CLS = Bar.constants.toolbar = 'cryptpad-toolbar';

    var LEFTSIDE_CLS = Bar.constants.leftside = 'cryptpad-toolbar-leftside';
    var RIGHTSIDE_CLS = Bar.constants.rightside = 'cryptpad-toolbar-rightside';

    var SPINNER_CLS = Bar.constants.spinner = 'cryptpad-spinner';

    var STATE_CLS = Bar.constants.state = 'cryptpad-state';

    var USERNAME_CLS = Bar.constants.username = 'cryptpad-toolbar-username';

    var READONLY_CLS = Bar.constants.readonly = 'cryptpad-readonly';

    var USERBUTTONS_CONTAINER_CLS = Bar.constants.userButtonsContainer = "cryptpad-userbuttons-container";
    var USERLIST_CLS = Bar.constants.userlist = "cryptpad-dropdown-users";
    var EDITSHARE_CLS = Bar.constants.editShare = "cryptpad-dropdown-editShare";
    var VIEWSHARE_CLS = Bar.constants.viewShare = "cryptpad-dropdown-viewShare";
    var DROPDOWN_CONTAINER_CLS = Bar.constants.dropdownContainer = "cryptpad-dropdown-container";
    var DROPDOWN_CLS = Bar.constants.dropdown = "cryptpad-dropdown";

    /** Key in the localStore which indicates realtime activity should be disallowed. */
    // TODO remove? will never be used in cryptpad
    var LOCALSTORAGE_DISALLOW = Bar.constants.localstorageDisallow = 'cryptpad-disallow';

    var SPINNER_DISAPPEAR_TIME = 3000;
    var SPINNER = [ '-', '\\', '|', '/' ];

    var uid = function () {
        return 'cryptpad-uid-' + String(Math.random()).substring(2);
    };

    var $style;

    var firstConnection = true;

    var styleToolbar = function ($container, href) {
        href = href || '/customize/toolbar.css';

        $.ajax({
            url: href,
            dataType: 'text',
            success: function (data) {
                $container.append($('<style>').text(data));
            },
        });
    };

    var createRealtimeToolbar = function ($container) {
        var $toolbar = $('<div>', {
            'class': TOOLBAR_CLS,
            id: uid(),
        })
        .append($('<div>', {'class': LEFTSIDE_CLS}))
        .append($('<div>', {'class': RIGHTSIDE_CLS}));

        $container.prepend($toolbar);
        styleToolbar($container);
        return $toolbar;
    };

    var createSpinner = function ($container) {
        var $spinner = $('<div>', {
            id: uid(),
            'class': SPINNER_CLS,
        });
        $container.append($spinner);
        return $spinner[0];
    };

    var kickSpinner = function (spinnerElement, reversed) {
        var txt = spinnerElement.textContent || '-';
        var inc = (reversed) ? -1 : 1;
        spinnerElement.textContent = SPINNER[(SPINNER.indexOf(txt) + inc) % SPINNER.length];
        if (spinnerElement.timeout) { clearTimeout(spinnerElement.timeout); }
        spinnerElement.timeout = setTimeout(function () {
            spinnerElement.textContent = '';
        }, SPINNER_DISAPPEAR_TIME);
    };

    var createUserButtons = function ($userlistElement, readOnly) {
        var $listElement = $('<span>', {
            id: 'userButtons',
            'class': USERBUTTONS_CONTAINER_CLS
        }).appendTo($userlistElement);

        var $editIcon = $('<button>', {
            'class': 'userlist dropbtn edit',
        });
        var $editIconSmall = $editIcon.clone().addClass('small');
        var $viewIcon = $('<button>', {
            'class': 'userlist dropbtn view',
        });
        var $viewIconSmall = $viewIcon.clone().addClass('small');

        var $shareTitle = $('<h2>').text(Messages.share);
        var $dropdownEditUsers = $('<p>', {'class': USERLIST_CLS});
        var $dropdownEditShare = $('<p>', {'class': EDITSHARE_CLS});
        if (readOnly !== 1) {
            $dropdownEditShare.append($shareTitle);
        }
        var $dropdownEditContainer = $('<div>', {'class': DROPDOWN_CONTAINER_CLS});
        var $dropdownEdit = $('<div>', {
            id: "cryptpad-dropdown-edit",
            'class': DROPDOWN_CLS
        }).append($dropdownEditUsers).append($dropdownEditShare);

        var $dropdownViewShare = $('<p>', {'class': VIEWSHARE_CLS}).append($shareTitle.clone());
        var $dropdownViewContainer = $('<div>', {'class': DROPDOWN_CONTAINER_CLS});
        var $dropdownView = $('<div>', {
            id: "cryptpad-dropdown-view",
            'class': DROPDOWN_CLS
        }).append($dropdownViewShare);

        var createHandler = function ($elmt) {
            return function () {
                if ($elmt.is(':visible')) {
                    $elmt.hide();
                    return;
                }
                $userlistElement.find('.' + DROPDOWN_CLS).hide();
                $elmt.show();
            };
        };
        $editIcon.click(createHandler($dropdownEdit));
        $editIconSmall.click(createHandler($dropdownEdit));
        $viewIcon.click(createHandler($dropdownView));
        $viewIconSmall.click(createHandler($dropdownView));

        $dropdownEditContainer.append($editIcon).append($editIconSmall).append($dropdownEdit);
        $dropdownViewContainer.append($viewIcon).append($viewIconSmall).append($dropdownView);

        $listElement.append($dropdownEditContainer);
        if (readOnly !== -1) {
            $listElement.append($dropdownViewContainer);
        }


    };

    var createUserList = function ($container, readOnly) {
        var $state = $('<span>', {'class': STATE_CLS}).text(Messages.synchronizing);
        var $usernameElement = $('<span>', {'class': USERNAME_CLS});
        var $userlist = $('<div>', {
            'class': USER_LIST_CLS,
            id: uid(),
        }).append($state).append($usernameElement);
        createUserButtons($userlist, readOnly);
        $container.append($userlist);
        return $userlist[0];
    };

    var getOtherUsers = function(myUserName, userList, userData) {
      var i = 0;
      var list = [];
      userList.forEach(function(user) {
        if(user !== myUserName) {
          var data = (userData) ? (userData[user] || null) : null;
          var userName = (data) ? data.name : null;
          if(userName) {
            list.push(userName);
          }
        }
      });
      return list;
    };

    var arrayIntersect = function(a, b) {
        return $.grep(a, function(i) {
            return $.inArray(i, b) > -1;
        });
    };

    var getViewers = function (n) {
        if (!n || !parseInt(n) || n === 0) { return ''; }
        if (n === 1) { return '; + ' + Messages.oneViewer; }
        return '; + ' + Messages._getKey('viewers', [n]);
    };
    var updateUserList = function (myUserName, userlistElement, userList, userData, readOnly, $stateElement) {
        var meIdx = userList.indexOf(myUserName);
        if (meIdx === -1) {
            $stateElement.text(Messages.synchronizing);
            return;
        }
        $stateElement.text('');

        // Make sure the user block elements are displayed
        var $userButtons = $(userlistElement).find("#userButtons");
        $userButtons.show();
        var $userElement = $(userlistElement).find('.' + USERNAME_CLS);
        $userElement.show();

        var numberOfUsers = userList.length;

        // If we are using old pads (readonly unavailable), only editing users are in userList.
        // With new pads, we also have readonly users in userList, so we have to intersect with
        // the userData to have only the editing users. We can't use userData directly since it
        // contains data about users that have already left the channel.
        userList = readOnly === -1 ? userList : arrayIntersect(userList, Object.keys(userData));

        var numberOfViewUsers = numberOfUsers - userList.length;

        // Names of editing users
        var editUsersNames = getOtherUsers(myUserName, userList, userData);

        // Number of anonymous editing users
        var anonymous = numberOfUsers - editUsersNames.length;

        // Update the userlist
        var editUsersList = '';
        if (readOnly !== 1) {
            editUsersNames.unshift('<span class="yourself">' + Messages.yourself + '</span>');
            anonymous--;
        }
        if (anonymous > 0) {
            var text = anonymous === 1 ? Messages.anonymousUser : Messages.anonymousUsers;
            editUsersNames.push('<span class="anonymous">' + anonymous + ' ' + text + '</span>');
        }
        if (editUsersNames.length > 0) {
            editUsersList += editUsersNames.join('<br>');
        }
        var $usersTitle = $('<h2>').text(Messages.users);
        var $editUsers = $userButtons.find('.' + USERLIST_CLS);
        $editUsers.html('').append($usersTitle).append(editUsersList);

        // Update the buttons
        var fa_caretdown = '<span class="fa fa-caret-down" style="font-family:FontAwesome;"></span>';
        var fa_editusers = '<span class="fa fa-users" style="font-family:FontAwesome;"></span>';
        var fa_viewusers = '<span class="fa fa-eye" style="font-family:FontAwesome;"></span>';
        $userButtons.find('.userlist.edit').html(fa_editusers + ' ' + userList.length + ' ' + Messages.editing + ' ' + fa_caretdown);
        $userButtons.find('.userlist.edit.small').html(fa_editusers + ' ' + userList.length + ' ' + fa_caretdown);
        $userButtons.find('.userlist.view').html(fa_viewusers + ' ' + numberOfViewUsers + ' ' + Messages.viewing + ' ' + fa_caretdown);
        $userButtons.find('.userlist.view.small').html(fa_viewusers + ' ' + numberOfViewUsers + ' ' + fa_caretdown);

        if (readOnly === 1) {
            // TODO
            $userElement.html('<span class="' + READONLY_CLS + '">' + Messages.readonly + '</span>');
        }
        else  {
            var name = userData[myUserName] && userData[myUserName].name;
            var icon = '<span class="fa fa-user" style="font-family:FontAwesome;"></span>';
            if (!name) {
                name = Messages.anonymous;
            }
            $userElement.find("button").html(icon + ' ' + name);
        }
    };

    var createLagElement = function ($container) {
        var $lag = $('<div>', {
            'class': LAG_ELEM_CLS,
            id: uid(),
        });
        $container.before($lag);
        return $lag[0];
    };

    var checkLag = function (getLag, lagElement) {
        var lag;
        if(typeof getLag === "function") {
            lag = getLag();
        }
        var lagLight = $('<div>', {
            'class': 'lag'
        });
        var title;
        if(lag) {
          firstConnection = false;
          title = Messages.lag + ' : ' + lag + ' ms\n';
          if (lag.waiting || lag > 1000) {
            lagLight.addClass('lag-orange');
            title += Messages.orangeLight;
          } else {
            lagLight.addClass('lag-green');
            title += Messages.greenLight;
          }
        }
        else if (!firstConnection){
          lagLight.addClass('lag-red');
          title = Messages.redLight;
        }
        lagLight.attr('title', title);
        $(lagElement).html('');
        $(lagElement).append(lagLight);
    };

    var create = Bar.create = function ($container, myUserName, realtime, getLag, userList, config) {
        var readOnly = (typeof config.readOnly !== "undefined") ? (config.readOnly ? 1 : 0) : -1;

        var toolbar = createRealtimeToolbar($container);
        var userListElement = createUserList(toolbar.find('.' + LEFTSIDE_CLS), readOnly);
        var spinner = createSpinner(toolbar.find('.' + RIGHTSIDE_CLS));
        var lagElement = createLagElement(toolbar.find('.' + RIGHTSIDE_CLS));
        var userData = config.userData;
        // readOnly = 1 (readOnly enabled), 0 (disabled), -1 (old pad without readOnly mode)
        var saveElement;
        var loadElement;
        var $stateElement = $(userListElement).find('.' + STATE_CLS);

        var connected = false;

        if (config.ifrw) {
            var removeDropdowns =  function (e) {
                if (e.target.matches('.dropbtn') || (e.target.parentElement && e.target.parentElement.matches('.dropbtn'))) {
                    return;
                }
                $container.find('.cryptpad-dropdown').hide();
            };
            $(config.ifrw).on('click',removeDropdowns);
            if (config.ifrw.$('iframe').length) {
                var innerIfrw = config.ifrw.$('iframe').each(function (i, el) {
                    $(el.contentWindow).on('click', removeDropdowns);
                });
            }
        }

        userList.onChange = function(newUserData) {
          var users = userList.users;
          if (users.indexOf(myUserName) !== -1) { connected = true; }
          if (!connected) { return; }
          if(newUserData) { // Someone has changed his name/color
            userData = newUserData;
          }
          updateUserList(myUserName, userListElement, users, userData, readOnly, $stateElement);
        };

        var ks = function () {
            if (connected) { kickSpinner(spinner, false); }
        };

        realtime.onPatch(ks);
        // Try to filter out non-patch messages, doesn't have to be perfect this is just the spinner
        realtime.onMessage(function (msg) { if (msg.indexOf(':[2,') > -1) { ks(); } });

        checkLag(getLag, lagElement);
        setInterval(function () {
            if (!connected) { return; }
            checkLag(getLag, lagElement);
        }, 3000);

        return {
            failed: function () {
                connected = false;
                $stateElement.text(Messages.disconnected);
                checkLag(undefined, lagElement);
            },
            reconnecting: function (userId) {
                myUserName = userId;
                connected = false;
                $stateElement.text(Messages.reconnecting);
                checkLag(getLag, lagElement);
            },
            connected: function () {
                connected = true;
            }
        };
    };

    return Bar;
});
