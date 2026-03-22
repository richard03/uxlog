//! Vstupní bod desktop aplikace UXLog.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    uxlog_lib::run()
}
