/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2019 Marc Ruiz Altisent. All rights reserved.
 *
 *  This file is part of FoxReplace.
 *
 *  FoxReplace is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software
 *  Foundation, either version 3 of the License, or (at your option) any later version.
 *
 *  FoxReplace is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 *  A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along with FoxReplace. If not, see <http://www.gnu.org/licenses/>.
 *
 *  ***** END LICENSE BLOCK ***** */

/**
 *  A cell renderer that shows edit and delete buttons.
 */
class ButtonsCellRenderer {

  init(params) {
    this.edit = ButtonsCellRenderer.createIconButton("edit mr-4");
    this.edit.setAttribute("style", "font-size: large;");
    this.editListener = () => {
      groupEditor.setGroup(params.node.data);
      $("#groupEditorModal").modal("show");
    };
    this.edit.addEventListener("click", this.editListener);

    this.del = ButtonsCellRenderer.createIconButton("backspace");
    this.deleteListener = () => {
      params.api.updateRowData({ remove: [params.node.data] });
      params.api.dispatchEvent(new Event("listChanged"));
    };
    this.del.addEventListener("click", this.deleteListener);

    this.gui = document.createElement("div");
    this.gui.appendChild(this.edit);
    this.gui.appendChild(this.del);
  }

  getGui() {
    return this.gui;
  }

  destroy() {
    this.edit.removeEventListener("click", this.editListener);
    this.del.removeEventListener("click", this.deleteListener);
    delete this.edit;
    delete this.del;
    delete this.gui;
  }

  static createIconButton(iconName) {
    let icon = document.createElement("i");
    icon.setAttribute("class", `fas fa-${iconName}`);
    return icon;
  }

}

/**
 *  A cell renderer that shows a checkbox and is also able to edit a boolean field.
 */
class CheckboxCellRenderer {

  init(params) {
    this.checkbox = document.createElement("input");
    this.checkbox.setAttribute("type", "checkbox");
    this.checkbox.checked = params.value;
    this.listener = (event) => {
      params.node.setDataValue(params.column, event.target.checked);
      params.api.dispatchEvent(new Event("listChanged"));
    };
    this.checkbox.addEventListener("input", this.listener);
  }

  getGui() {
    return this.checkbox;
  }

  destroy() {
    this.checkbox.removeEventListener("input", this.listener);
    delete this.checkbox;
  }

  refresh(params) {
    this.checkbox.checked = params.value;
  }

}

/**
 *  A cell renderer that shows a button to delete the row.
 */
class DeleteButtonCellRenderer {

  init(params) {
    let isEmpty = params.value === "";

    if (isEmpty) {
      this.gui = "";
    }
    else {
      this.gui = document.createElement("i");
      this.gui.setAttribute("class", "fas fa-backspace");
      this.deleteListener = () => {
        params.api.updateRowData({ remove: [params.node.data] });
      };
      this.gui.addEventListener("click", this.deleteListener);
    }
  }

  getGui() {
    return this.gui;
  }

  destroy() {
    if (this.gui !== "") {
      this.gui.removeEventListener("click", this.deleteListener);
    }
    delete this.gui;
  }

}

/**
 *  Cell editor for the input type. Shows a dropdown menu with the options.
 */
class InputTypeEditor {

  static getOption(params, value, text) {
    return '<option value="' + value + '"' + (value == params.value ? ' selected' : '') + '>' + text + '</option>';
  }

  init(params) {
    this.gui = $('<select>' +
                  InputTypeEditor.getOption(params, 0, browser.i18n.getMessage("inputType.text")) +
                  InputTypeEditor.getOption(params, 1, browser.i18n.getMessage("inputType.wholeWords")) +
                  InputTypeEditor.getOption(params, 2, browser.i18n.getMessage("inputType.regExp")) +
                 '</select>')[0];
    this.width = params.column.actualWidth;
    this.api = params.api;
  }

  getGui() {
    return this.gui;
  }

  afterGuiAttached() {
    this.gui.style = `width: ${this.width}px`;

    if (this.api.getFocusedCell().column.colId == "inputType") {
      this.focusIn(); // special case for when edition starts in this cell
    }
  }

  getValue() {
    return this.gui.value;
  }

  focusIn() {
    this.gui.focus();
  }

  destroy() {
    delete this.gui;
  }

}

/**
 *  A cell editor that shows a checkbox.
 */
class CheckboxCellEditor {

  init(params) {
    this.gui = $('<input type="checkbox" class="checkboxEditor"' + (params.value ? 'checked' : '') + '>')[0];
    this.api = params.api;
  }

  getGui() {
    return this.gui;
  }

  afterGuiAttached() {
    if (this.api.getFocusedCell().column.colId == "caseSensitive") {
      this.focusIn(); // special case for when edition starts in this cell
    }
  }

  getValue() {
    return this.gui.checked;
  }

  focusIn() {
    this.gui.focus();
  }

  destroy() {
    delete this.gui;
  }

}
