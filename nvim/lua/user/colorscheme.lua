require('nightfox').setup({
  options = {
	transparent = true,
    styles = {
	  --comments = "italic",
      keywords = "bold",
      types = "bold",
	  --functions = "bold",
    }
  }
})
vim.cmd("colorscheme carbonfox")
--vim.cmd [[
--try
--  colorscheme carbonfox 
--  set background=dark
--catch /^Vim\%((\a\+)\)\=:E185/
--  colorscheme default
--  set background=light
--endtry
--]]
