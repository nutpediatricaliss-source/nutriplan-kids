ALTER TABLE public.pacientes
 ADD COLUMN representante1_nombre text,
 ADD COLUMN representante2_nombre text,
 ADD COLUMN contacto_celular text,
 ADD COLUMN contacto_correo text,
 ADD COLUMN datos_facturacion text,
 ADD COLUMN antecedentes_personales text,
 ADD COLUMN antecedentes_familiares text,
 ADD COLUMN alergias text[],
 ADD COLUMN intolerancias text[],
 ADD COLUMN alimentos_gustan text[],
 ADD COLUMN alimentos_no_gustan text[],
 ADD COLUMN vitaminas_suplementos text;